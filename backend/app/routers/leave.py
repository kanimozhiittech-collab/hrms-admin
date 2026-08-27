from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional

from ..database import get_db
from ..models import (
    AttendanceLog, Department, Employee, Holiday, LeaveApprovalConfig, LeaveBalance,
    LeaveRequest, LeaveType, User,
)
from ..models.attendance import ATT_ON_LEAVE, ATT_HALF_DAY
from ..models.leave import LR_PENDING, LR_APPROVED, LR_REJECTED, LR_CANCELLED
from ..schemas.leave import (
    LeaveTypeIn, LeaveTypeOut, LeaveBalanceOut, LeaveBalanceAdjustIn, LeaveRequestIn, LeaveRequestOut,
    LeaveReview, LeaveCalendarItem, LeaveApprovalConfigIn, LeaveApprovalConfigOut,
)
from ..core.worktime import working_days, iter_dates, is_weekend
from ..core.storage import save_upload
from .deps import current_user

router = APIRouter(prefix="/api/leave", tags=["leave"])

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}


def _is_hr(user: User) -> bool:
    return user.role in HR_ROLES


def _own_employee_id(db: Session, user: User) -> Optional[str]:
    emp = _resolve_employee(db, user)
    return emp.id if emp else None


def _is_on_approved_leave_today(db: Session, employee_id: str) -> bool:
    """Level 1 counts as "unavailable" when they themselves have an approved
    leave request covering today — that's what triggers Level 2 failover."""
    today = date.today()
    return db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status == LR_APPROVED,
        LeaveRequest.from_date <= today,
        LeaveRequest.to_date >= today,
    ).first() is not None


def _department_approval_config(db: Session, company_id: str, department_id: Optional[str]) -> Optional[LeaveApprovalConfig]:
    if not department_id:
        return None
    return db.query(LeaveApprovalConfig).filter(
        LeaveApprovalConfig.company_id == company_id,
        LeaveApprovalConfig.department_id == department_id,
        LeaveApprovalConfig.status == "active",
    ).first()


def _current_approver_employee_id(db: Session, req: LeaveRequest, target: Optional[Employee] = None) -> Optional[str]:
    """Who should be reviewing this request right now. A department's
    configured Level 1 is the normal approver; if Level 2 exists (two-level
    approval) and Level 1 is on approved leave today, it shifts to Level 2.
    Falls back to the employee's plain reporting manager when the
    department has no approval config set up."""
    target = target or db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not target:
        return None
    config = _department_approval_config(db, req.company_id, target.department_id)
    if config:
        if config.approval_type == "two_level" and config.level2_employee_id and _is_on_approved_leave_today(db, config.level1_employee_id):
            return config.level2_employee_id
        return config.level1_employee_id
    return target.reporting_manager_id


def _can_review(db: Session, user: User, req: LeaveRequest) -> bool:
    """HR can review anyone's request. Otherwise, only the request's current
    approver (the department's configured Level 1 — or Level 2 if Level 1 is
    on approved leave today — falling back to the plain reporting manager
    when no department config exists) may approve/reject it."""
    if _is_hr(user):
        return True
    my_emp_id = _own_employee_id(db, user)
    if not my_emp_id:
        return False
    return _current_approver_employee_id(db, req) == my_emp_id


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
        file_name=r.file_name,
        file_url=r.file_url,
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
# Leave approval configuration (per-department Level 1 / Level 2 routing)
# ──────────────────────────────────────────────
def _config_to_out(c: LeaveApprovalConfig, dept_names: dict, emp_names: dict) -> LeaveApprovalConfigOut:
    return LeaveApprovalConfigOut(
        id=c.id,
        module=c.module,
        department_id=c.department_id,
        department_name=dept_names.get(c.department_id),
        approval_type=c.approval_type,
        level1_employee_id=c.level1_employee_id,
        level1_employee_name=emp_names.get(c.level1_employee_id),
        level2_employee_id=c.level2_employee_id,
        level2_employee_name=emp_names.get(c.level2_employee_id) if c.level2_employee_id else None,
        status=c.status,
    )


@router.get("/approval-config", response_model=List[LeaveApprovalConfigOut])
def list_approval_configs(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    rows = (
        db.query(LeaveApprovalConfig)
        .filter(LeaveApprovalConfig.company_id == user.company_id)
        .order_by(LeaveApprovalConfig.created_at.desc())
        .all()
    )
    dept_names = {d.id: d.name for d in db.query(Department).filter(Department.company_id == user.company_id).all()}
    emp_names = _name_map(db, user.company_id)
    return [_config_to_out(c, dept_names, emp_names) for c in rows]


@router.post("/approval-config", response_model=LeaveApprovalConfigOut)
def create_approval_config(
    payload: LeaveApprovalConfigIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    if payload.approval_type == "two_level" and not payload.level2_employee_id:
        raise HTTPException(status_code=400, detail="Level 2 is required for two-level approval")

    existing = db.query(LeaveApprovalConfig).filter(
        LeaveApprovalConfig.company_id == user.company_id,
        LeaveApprovalConfig.department_id == payload.department_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This department already has an approval configuration")

    config = LeaveApprovalConfig(company_id=user.company_id, module="Leave", **payload.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    dept_names = {d.id: d.name for d in db.query(Department).filter(Department.company_id == user.company_id).all()}
    emp_names = _name_map(db, user.company_id)
    return _config_to_out(config, dept_names, emp_names)


@router.put("/approval-config/{config_id}", response_model=LeaveApprovalConfigOut)
def update_approval_config(
    config_id: str,
    payload: LeaveApprovalConfigIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    if payload.approval_type == "two_level" and not payload.level2_employee_id:
        raise HTTPException(status_code=400, detail="Level 2 is required for two-level approval")

    config = db.query(LeaveApprovalConfig).filter(
        LeaveApprovalConfig.id == config_id, LeaveApprovalConfig.company_id == user.company_id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Approval configuration not found")

    dup = db.query(LeaveApprovalConfig).filter(
        LeaveApprovalConfig.company_id == user.company_id,
        LeaveApprovalConfig.department_id == payload.department_id,
        LeaveApprovalConfig.id != config_id,
    ).first()
    if dup:
        raise HTTPException(status_code=400, detail="This department already has an approval configuration")

    for k, v in payload.model_dump().items():
        setattr(config, k, v)
    db.commit()
    db.refresh(config)
    dept_names = {d.id: d.name for d in db.query(Department).filter(Department.company_id == user.company_id).all()}
    emp_names = _name_map(db, user.company_id)
    return _config_to_out(config, dept_names, emp_names)


@router.delete("/approval-config/{config_id}", status_code=204)
def delete_approval_config(
    config_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    config = db.query(LeaveApprovalConfig).filter(
        LeaveApprovalConfig.id == config_id, LeaveApprovalConfig.company_id == user.company_id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Approval configuration not found")
    db.delete(config)
    db.commit()


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

    if payload.from_date < date.today():
        raise HTTPException(status_code=400, detail="Can't apply for leave starting in the past")

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


@router.post("/requests/{request_id}/document", response_model=LeaveRequestOut)
def upload_leave_document(
    request_id: str, file: UploadFile = File(...),
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    """Attach a supporting document (medical certificate etc.) to a leave
    request — only the requester themselves can attach one, and only while
    it's still pending (once reviewed, the record shouldn't keep changing)."""
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id == request_id, LeaveRequest.company_id == user.company_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if req.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only attach documents to your own request")
    if req.status != LR_PENDING:
        raise HTTPException(status_code=400, detail="Cannot attach a document to a reviewed request")

    req.file_name, req.file_url = save_upload(file, "leave-documents")
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
        reviewable_ids = set()
        if my_emp_id:
            reviewable_ids.update(
                e.id for e in db.query(Employee.id)
                .filter(Employee.company_id == user.company_id, Employee.reporting_manager_id == my_emp_id)
                .all()
            )
            # Departments where I'm configured as Level 1 or Level 2 approver —
            # Level 2 shows up here too so they can act once Level 1 is out;
            # _can_review still gates the actual approve/reject action.
            configured_dept_ids = [
                c.department_id for c in db.query(LeaveApprovalConfig).filter(
                    LeaveApprovalConfig.company_id == user.company_id,
                    LeaveApprovalConfig.status == "active",
                    or_(
                        LeaveApprovalConfig.level1_employee_id == my_emp_id,
                        LeaveApprovalConfig.level2_employee_id == my_emp_id,
                    ),
                ).all()
            ]
            if configured_dept_ids:
                reviewable_ids.update(
                    e.id for e in db.query(Employee.id)
                    .filter(Employee.company_id == user.company_id, Employee.department_id.in_(configured_dept_ids))
                    .all()
                )
        if not reviewable_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
        q = q.filter(LeaveRequest.employee_id.in_(reviewable_ids))
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
