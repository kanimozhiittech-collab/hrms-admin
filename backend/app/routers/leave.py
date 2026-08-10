from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional

from ..database import get_db
from ..models import (
    AttendanceLog, Employee, Holiday, LeaveBalance, LeaveRequest, LeaveType, User,
)
from ..models.attendance import ATT_ON_LEAVE, ATT_HALF_DAY
from ..models.leave import LR_PENDING, LR_APPROVED, LR_REJECTED, LR_CANCELLED
from ..schemas.leave import (
    LeaveTypeIn, LeaveTypeOut, LeaveBalanceOut, LeaveBalanceAdjustIn, LeaveRequestIn, LeaveRequestOut,
    LeaveReview, LeaveCalendarItem,
)
from ..core.worktime import working_days, iter_dates, is_weekend
from .deps import current_user

router = APIRouter(prefix="/api/leave", tags=["leave"])

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}


def _is_hr(user: User) -> bool:
    return user.role in HR_ROLES


def _own_employee_id(db: Session, user: User) -> Optional[str]:
    emp = _resolve_employee(db, user)
    return emp.id if emp else None


def _can_review(db: Session, user: User, req: LeaveRequest) -> bool:
    """HR can review anyone's request; a reporting manager can review their own reports'."""
    if _is_hr(user):
        return True
    my_emp_id = _own_employee_id(db, user)
    if not my_emp_id:
        return False
    target = db.query(Employee).filter(Employee.id == req.employee_id).first()
    return bool(target and target.reporting_manager_id == my_emp_id)


def _resolve_employee(db: Session, user: User) -> Employee | None:
    emp = None
    if user.employee_id:
        emp = db.query(Employee).filter(
            Employee.id == user.employee_id, Employee.company_id == user.company_id
        ).first()
    if not emp:
        emp = db.query(Employee).filter(
            Employee.company_id == user.company_id, Employee.work_email == user.email
        ).first()
    return emp


def _emp_name(emp: Employee | None) -> Optional[str]:
    if not emp:
        return None
    return emp.display_name or f"{emp.first_name} {emp.last_name}".strip()


def _name_map(db: Session, company_id: str) -> dict:
    rows = db.query(Employee).filter(Employee.company_id == company_id).all()
    return {e.id: _emp_name(e) for e in rows}


def _type_map(db: Session, company_id: str) -> dict:
    rows = db.query(LeaveType).filter(LeaveType.company_id == company_id).all()
    return {t.id: t for t in rows}


def _holidays(db: Session, company_id: str, year: int) -> set[date]:
    return {
        h.holiday_date
        for h in db.query(Holiday).filter(
            Holiday.company_id == company_id,
            Holiday.is_active == True,  # noqa: E712
        ).all()
    }


def _get_or_create_balance(
    db: Session, emp: Employee, leave_type: LeaveType, year: int
) -> LeaveBalance:
    bal = (
        db.query(LeaveBalance)
        .filter(
            LeaveBalance.employee_id == emp.id,
            LeaveBalance.leave_type_id == leave_type.id,
            LeaveBalance.year == year,
        )
        .first()
    )
    if not bal:
        bal = LeaveBalance(
            company_id=emp.company_id,
            employee_id=emp.id,
            leave_type_id=leave_type.id,
            year=year,
            allocated=leave_type.days_per_year,
            used=0,
            pending=0,
            carried_forward=0,
        )
        db.add(bal)
        db.flush()
    return bal


def _request_to_out(r: LeaveRequest, names: dict, types: dict) -> LeaveRequestOut:
    lt = types.get(r.leave_type_id)
    return LeaveRequestOut(
        id=r.id,
        employee_id=r.employee_id,
        employee_name=names.get(r.employee_id),
        leave_type_id=r.leave_type_id,
        leave_type_name=lt.name if lt else None,
        leave_type_code=lt.code if lt else None,
        color=lt.color if lt else None,
        from_date=r.from_date,
        to_date=r.to_date,
        half_day=r.half_day,
        half_day_session=r.half_day_session,
        days_count=r.days_count,
        reason=r.reason,
        status=r.status,
        review_comment=r.review_comment,
        reviewed_at=r.reviewed_at,
        created_at=r.created_at,
    )


# ──────────────────────────────────────────────
# Leave types
# ──────────────────────────────────────────────
@router.get("/types", response_model=List[LeaveTypeOut])
def list_types(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return (
        db.query(LeaveType)
        .filter(LeaveType.company_id == user.company_id, LeaveType.is_active == True)  # noqa: E712
        .order_by(LeaveType.name)
        .all()
    )


@router.post("/types", response_model=LeaveTypeOut)
def create_type(
    payload: LeaveTypeIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    lt = LeaveType(company_id=user.company_id, **payload.model_dump())
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return lt


@router.put("/types/{type_id}", response_model=LeaveTypeOut)
def update_type(
    type_id: str,
    payload: LeaveTypeIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    lt = db.query(LeaveType).filter(
        LeaveType.id == type_id, LeaveType.company_id == user.company_id
    ).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")
    for k, v in payload.model_dump().items():
        setattr(lt, k, v)
    db.commit()
    db.refresh(lt)
    return lt


# ──────────────────────────────────────────────
# Leave balances
# ──────────────────────────────────────────────
def _balances_for(db: Session, emp: Employee, year: int) -> List[LeaveBalanceOut]:
    types = (
        db.query(LeaveType)
        .filter(LeaveType.company_id == emp.company_id, LeaveType.is_active == True)  # noqa: E712
        .order_by(LeaveType.name)
        .all()
    )
    out = []
    for lt in types:
        bal = _get_or_create_balance(db, emp, lt, year)
        out.append(
            LeaveBalanceOut(
                id=bal.id,
                leave_type_id=lt.id,
                leave_type_name=lt.name,
                leave_type_code=lt.code,
                color=lt.color,
                year=year,
                allocated=bal.allocated,
                used=bal.used,
                pending=bal.pending,
                carried_forward=bal.carried_forward,
                available=bal.available,
            )
        )
    db.commit()
    return out


@router.get("/balance", response_model=List[LeaveBalanceOut])
def my_balance(
    year: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    year = year or date.today().year
    emp = _resolve_employee(db, user)
    if not emp:
        return []
    return _balances_for(db, emp, year)


@router.get("/balance/{employee_id}", response_model=List[LeaveBalanceOut])
def employee_balance(
    employee_id: str,
    year: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    year = year or date.today().year
    emp = db.query(Employee).filter(
        Employee.id == employee_id, Employee.company_id == user.company_id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _balances_for(db, emp, year)


@router.put("/balance/{employee_id}/{leave_type_id}", response_model=LeaveBalanceOut)
def adjust_balance(
    employee_id: str,
    leave_type_id: str,
    payload: LeaveBalanceAdjustIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """HR override: set a specific employee's allocated days for a leave type/year,
    independent of the company-wide LeaveType.days_per_year default."""
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    year = payload.year or date.today().year
    emp = db.query(Employee).filter(
        Employee.id == employee_id, Employee.company_id == user.company_id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    lt = db.query(LeaveType).filter(
        LeaveType.id == leave_type_id, LeaveType.company_id == user.company_id
    ).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    bal = _get_or_create_balance(db, emp, lt, year)
    bal.allocated = payload.allocated
    db.commit()
    db.refresh(bal)
    return LeaveBalanceOut(
        id=bal.id, leave_type_id=lt.id, leave_type_name=lt.name, leave_type_code=lt.code,
        color=lt.color, year=year, allocated=bal.allocated, used=bal.used,
        pending=bal.pending, carried_forward=bal.carried_forward, available=bal.available,
    )


# ──────────────────────────────────────────────
# Leave requests
# ──────────────────────────────────────────────
@router.post("/requests", response_model=LeaveRequestOut)
def apply_leave(
    payload: LeaveRequestIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    emp = _resolve_employee(db, user)
    if not emp:
        raise HTTPException(status_code=400, detail="No employee profile linked to your account")

    lt = db.query(LeaveType).filter(
        LeaveType.id == payload.leave_type_id, LeaveType.company_id == user.company_id
    ).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    if payload.from_date > payload.to_date:
        raise HTTPException(status_code=400, detail="From date must be on or before To date")

    if payload.half_day and payload.from_date != payload.to_date:
        raise HTTPException(status_code=400, detail="Half-day leave must be a single day")

    if payload.half_day and not lt.allow_half_day:
        raise HTTPException(status_code=400, detail="This leave type does not allow half-day")

    # notice period
    if lt.min_notice_days > 0:
        notice = (payload.from_date - date.today()).days
        if notice < lt.min_notice_days:
            raise HTTPException(
                status_code=400,
                detail=f"This leave requires {lt.min_notice_days} day(s) advance notice",
            )

    # overlap check (pending or approved)
    overlap = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status.in_([LR_PENDING, LR_APPROVED]),
            LeaveRequest.from_date <= payload.to_date,
            LeaveRequest.to_date >= payload.from_date,
        )
        .first()
    )
    if overlap:
        raise HTTPException(status_code=400, detail="You already have a leave request in this date range")

    holidays = _holidays(db, user.company_id, payload.from_date.year)
    days = working_days(payload.from_date, payload.to_date, holidays, payload.half_day)
    if days <= 0:
        raise HTTPException(status_code=400, detail="Selected range has no working days")

    year = payload.from_date.year
    bal = _get_or_create_balance(db, emp, lt, year)
    if lt.is_paid and bal.available < days:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance: {bal.available} day(s) available, {days} requested",
        )

    req = LeaveRequest(
        company_id=user.company_id,
        employee_id=emp.id,
        user_id=user.id,
        leave_type_id=lt.id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        half_day=payload.half_day,
        half_day_session=payload.half_day_session,
        days_count=days,
        reason=payload.reason,
        status=LR_PENDING if lt.requires_approval else LR_APPROVED,
    )
    db.add(req)

    if lt.requires_approval:
        bal.pending += days
    else:
        bal.used += days
        req.reviewed_at = datetime.now()
        db.flush()
        _mark_attendance_on_leave(db, req)

    db.commit()
    db.refresh(req)
    names = _name_map(db, user.company_id)
    types = _type_map(db, user.company_id)
    return _request_to_out(req, names, types)


@router.get("/requests", response_model=List[LeaveRequestOut])
def my_requests(
    status: Optional[str] = Query(default=None),
    year: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = db.query(LeaveRequest).filter(LeaveRequest.user_id == user.id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    if year:
        q = q.filter(LeaveRequest.from_date >= date(year, 1, 1),
                     LeaveRequest.from_date <= date(year, 12, 31))
    reqs = q.order_by(LeaveRequest.created_at.desc()).all()
    names = _name_map(db, user.company_id)
    types = _type_map(db, user.company_id)
    return [_request_to_out(r, names, types) for r in reqs]


@router.get("/requests/team", response_model=List[LeaveRequestOut])
def team_requests(
    status: str = Query(default=LR_PENDING),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = db.query(LeaveRequest).filter(LeaveRequest.company_id == user.company_id)
    if not _is_hr(user):
        my_emp_id = _own_employee_id(db, user)
        report_ids = [
            e.id for e in db.query(Employee.id)
            .filter(Employee.company_id == user.company_id, Employee.reporting_manager_id == my_emp_id)
            .all()
        ] if my_emp_id else []
        if not report_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
        q = q.filter(LeaveRequest.employee_id.in_(report_ids))
    if status and status != "all":
        q = q.filter(LeaveRequest.status == status)
    reqs = q.order_by(LeaveRequest.created_at.desc()).all()
    names = _name_map(db, user.company_id)
    types = _type_map(db, user.company_id)
    return [_request_to_out(r, names, types) for r in reqs]


def _mark_attendance_on_leave(db: Session, req: LeaveRequest):
    """Create/update attendance logs for each leave working day."""
    holidays = _holidays(db, req.company_id, req.from_date.year)
    for d in iter_dates(req.from_date, req.to_date):
        if is_weekend(d) or d in holidays:
            continue
        log = (
            db.query(AttendanceLog)
            .filter(AttendanceLog.user_id == req.user_id, AttendanceLog.work_date == d)
            .first()
        )
        if not log:
            log = AttendanceLog(
                company_id=req.company_id,
                user_id=req.user_id,
                employee_id=req.employee_id,
                work_date=d,
            )
            db.add(log)
        log.status = ATT_HALF_DAY if req.half_day else ATT_ON_LEAVE
        log.leave_request_id = req.id


@router.put("/requests/{req_id}/approve", response_model=LeaveRequestOut)
def approve_request(
    req_id: str,
    payload: LeaveReview,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id == req_id, LeaveRequest.company_id == user.company_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not _can_review(db, user, req):
        raise HTTPException(status_code=403, detail="Not authorized")
    if req.status != LR_PENDING:
        raise HTTPException(status_code=400, detail="Request already reviewed")

    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    lt = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
    year = req.from_date.year
    bal = _get_or_create_balance(db, emp, lt, year)

    # move pending -> used
    bal.pending = max(bal.pending - req.days_count, 0)
    bal.used += req.days_count

    req.status = LR_APPROVED
    req.reviewed_by = user.id
    req.review_comment = payload.comment
    req.reviewed_at = datetime.now()

    _mark_attendance_on_leave(db, req)

    db.commit()
    db.refresh(req)
    names = _name_map(db, user.company_id)
    types = _type_map(db, user.company_id)
    return _request_to_out(req, names, types)


@router.put("/requests/{req_id}/reject", response_model=LeaveRequestOut)
def reject_request(
    req_id: str,
    payload: LeaveReview,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id == req_id, LeaveRequest.company_id == user.company_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not _can_review(db, user, req):
        raise HTTPException(status_code=403, detail="Not authorized")
    if req.status != LR_PENDING:
        raise HTTPException(status_code=400, detail="Request already reviewed")

    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    lt = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
    bal = _get_or_create_balance(db, emp, lt, req.from_date.year)
    bal.pending = max(bal.pending - req.days_count, 0)

    req.status = LR_REJECTED
    req.reviewed_by = user.id
    req.review_comment = payload.comment
    req.reviewed_at = datetime.now()

    db.commit()
    db.refresh(req)
    names = _name_map(db, user.company_id)
    types = _type_map(db, user.company_id)
    return _request_to_out(req, names, types)


@router.put("/requests/{req_id}/cancel", response_model=LeaveRequestOut)
def cancel_request(
    req_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id == req_id, LeaveRequest.user_id == user.id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status not in (LR_PENDING, LR_APPROVED):
        raise HTTPException(status_code=400, detail="Cannot cancel this request")

    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    lt = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
    bal = _get_or_create_balance(db, emp, lt, req.from_date.year)

    if req.status == LR_PENDING:
        bal.pending = max(bal.pending - req.days_count, 0)
    elif req.status == LR_APPROVED:
        bal.used = max(bal.used - req.days_count, 0)
        # clear attendance logs tied to this request
        for log in db.query(AttendanceLog).filter(
            AttendanceLog.leave_request_id == req.id
        ).all():
            db.delete(log)

    req.status = LR_CANCELLED
    db.commit()
    db.refresh(req)
    names = _name_map(db, user.company_id)
    types = _type_map(db, user.company_id)
    return _request_to_out(req, names, types)


@router.get("/calendar", response_model=List[LeaveCalendarItem])
def leave_calendar(
    month: int = Query(default=0, ge=0, le=12),
    year: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    import calendar as _cal
    today = date.today()
    month = month or today.month
    year = year or today.year
    start = date(year, month, 1)
    end = date(year, month, _cal.monthrange(year, month)[1])

    reqs = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.company_id == user.company_id,
            LeaveRequest.status == LR_APPROVED,
            LeaveRequest.from_date <= end,
            LeaveRequest.to_date >= start,
        )
        .all()
    )
    names = _name_map(db, user.company_id)
    types = _type_map(db, user.company_id)
    out = []
    for r in reqs:
        lt = types.get(r.leave_type_id)
        out.append(
            LeaveCalendarItem(
                id=r.id,
                employee_id=r.employee_id,
                employee_name=names.get(r.employee_id) or "Employee",
                leave_type_name=lt.name if lt else "Leave",
                color=lt.color if lt else "#2563EB",
                from_date=r.from_date,
                to_date=r.to_date,
                half_day=r.half_day,
                days_count=r.days_count,
                status=r.status,
            )
        )
    return out
