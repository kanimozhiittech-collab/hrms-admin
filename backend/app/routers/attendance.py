from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional
import calendar
import io
import csv

from ..database import get_db
from ..models import (
    AttendanceLog, Employee, Holiday, RegularizationRequest, Shift, User,
)
from ..models.attendance import (
    ATT_PRESENT, ATT_ABSENT, ATT_HALF_DAY, ATT_ON_LEAVE, ATT_HOLIDAY, ATT_WEEKEND,
)
from ..schemas.attendance import (
    AttendanceLogOut, AttendanceSummary, RegularizationIn, RegularizationOut,
    RegularizationReview,
)
from ..core.worktime import is_weekend
from .deps import current_user

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}


def _is_hr(user: User) -> bool:
    return user.role in HR_ROLES


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


def _user_display(user: User) -> str:
    return user.email.split("@")[0].replace(".", " ").replace("_", " ").title()


def _user_name_map(db: Session, company_id: str) -> dict:
    """Attendance logs always have a user_id, but not always an employee_id —
    e.g. a Company Admin who checks in without ever being added as an Employee.
    Falls back to this map so those rows show a name instead of blank."""
    rows = db.query(User).filter(User.company_id == company_id).all()
    return {u.id: _user_display(u) for u in rows}


def _log_name(log: AttendanceLog, emp_names: dict, user_names: dict) -> Optional[str]:
    return emp_names.get(log.employee_id) or user_names.get(log.user_id)


def _log_to_out(log: AttendanceLog, name: Optional[str]) -> AttendanceLogOut:
    return AttendanceLogOut(
        id=log.id,
        employee_id=log.employee_id,
        employee_name=name,
        work_date=log.work_date,
        check_in_at=log.check_in_at,
        check_out_at=log.check_out_at,
        status=log.status,
        work_hours=log.work_hours,
        overtime_hours=log.overtime_hours,
        late_minutes=log.late_minutes,
        early_exit_minutes=log.early_exit_minutes,
        is_regularized=log.is_regularized,
        source=log.source,
    )


# ──────────────────────────────────────────────
# Employee — my attendance
# ──────────────────────────────────────────────
@router.get("/my", response_model=List[AttendanceLogOut])
def my_attendance(
    month: int = Query(default=0, ge=0, le=12),
    year: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    today = date.today()
    month = month or today.month
    year = year or today.year
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])

    logs = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.user_id == user.id,
            AttendanceLog.work_date >= start,
            AttendanceLog.work_date <= end,
        )
        .order_by(AttendanceLog.work_date.desc())
        .all()
    )
    emp = _resolve_employee(db, user)
    name = _emp_name(emp)
    return [_log_to_out(l, name) for l in logs]


@router.get("/my/summary", response_model=AttendanceSummary)
def my_summary(
    month: int = Query(default=0, ge=0, le=12),
    year: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    today = date.today()
    month = month or today.month
    year = year or today.year
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])

    logs = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.user_id == user.id,
            AttendanceLog.work_date >= start,
            AttendanceLog.work_date <= end,
        )
        .order_by(AttendanceLog.work_date.desc())
        .all()
    )

    holidays = {
        h.holiday_date
        for h in db.query(Holiday).filter(
            Holiday.company_id == user.company_id,
            Holiday.holiday_date >= start,
            Holiday.holiday_date <= end,
            Holiday.is_active == True,  # noqa: E712
        ).all()
    }

    present = sum(1 for l in logs if l.status == ATT_PRESENT)
    absent = sum(1 for l in logs if l.status == ATT_ABSENT)
    half_day = sum(1 for l in logs if l.status == ATT_HALF_DAY)
    on_leave = sum(1 for l in logs if l.status == ATT_ON_LEAVE)
    late_count = sum(1 for l in logs if (l.late_minutes or 0) > 0)
    total_work_hours = round(sum(l.work_hours or 0 for l in logs), 2)
    total_overtime = round(sum(l.overtime_hours or 0 for l in logs), 2)

    weekend_count = sum(
        1 for d in range((end - start).days + 1)
        if is_weekend(start.fromordinal(start.toordinal() + d))
    )

    emp = _resolve_employee(db, user)
    name = _emp_name(emp)
    return AttendanceSummary(
        month=month,
        year=year,
        present=present,
        absent=absent,
        half_day=half_day,
        on_leave=on_leave,
        holidays=len(holidays),
        weekends=weekend_count,
        late_count=late_count,
        total_work_hours=total_work_hours,
        total_overtime=total_overtime,
        logs=[_log_to_out(l, name) for l in logs],
    )


# ──────────────────────────────────────────────
# HR — all employees
# ──────────────────────────────────────────────
@router.get("", response_model=List[AttendanceLogOut])
def all_attendance(
    on_date: Optional[date] = Query(default=None),
    department_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    target = on_date or date.today()
    q = db.query(AttendanceLog).filter(
        AttendanceLog.company_id == user.company_id,
        AttendanceLog.work_date == target,
    )
    if status:
        q = q.filter(AttendanceLog.status == status)
    logs = q.all()

    names = _name_map(db, user.company_id)
    user_names = _user_name_map(db, user.company_id)
    out = [_log_to_out(l, _log_name(l, names, user_names)) for l in logs]

    if department_id:
        dept_emp_ids = {
            e.id for e in db.query(Employee).filter(
                Employee.company_id == user.company_id,
                Employee.department_id == department_id,
            ).all()
        }
        out = [o for o in out if o.employee_id in dept_emp_ids]
    return out


@router.get("/report")
def attendance_report(
    month: int = Query(default=0, ge=0, le=12),
    year: int = Query(default=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    today = date.today()
    month = month or today.month
    year = year or today.year
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])

    logs = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.company_id == user.company_id,
            AttendanceLog.work_date >= start,
            AttendanceLog.work_date <= end,
        )
        .order_by(AttendanceLog.work_date)
        .all()
    )
    names = _name_map(db, user.company_id)
    user_names = _user_name_map(db, user.company_id)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Employee", "Date", "Status", "Check In", "Check Out",
        "Work Hours", "Overtime", "Late (min)", "Regularized",
    ])
    for l in logs:
        writer.writerow([
            _log_name(l, names, user_names) or "",
            l.work_date.isoformat(),
            l.status,
            l.check_in_at.strftime("%H:%M") if l.check_in_at else "",
            l.check_out_at.strftime("%H:%M") if l.check_out_at else "",
            l.work_hours if l.work_hours is not None else "",
            l.overtime_hours if l.overtime_hours is not None else "",
            l.late_minutes if l.late_minutes is not None else "",
            "Yes" if l.is_regularized else "No",
        ])
    buf.seek(0)
    filename = f"attendance_{year}_{month:02d}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ──────────────────────────────────────────────
# Regularization
# ──────────────────────────────────────────────
@router.post("/regularize", response_model=RegularizationOut)
def create_regularization(
    payload: RegularizationIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    emp = _resolve_employee(db, user)
    if not emp:
        raise HTTPException(status_code=400, detail="No employee profile linked to your account")

    reg = RegularizationRequest(
        company_id=user.company_id,
        employee_id=emp.id,
        user_id=user.id,
        work_date=payload.work_date,
        requested_check_in=payload.requested_check_in,
        requested_check_out=payload.requested_check_out,
        reason=payload.reason,
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return RegularizationOut(
        id=reg.id, employee_id=reg.employee_id, employee_name=_emp_name(emp),
        work_date=reg.work_date, requested_check_in=reg.requested_check_in,
        requested_check_out=reg.requested_check_out, reason=reg.reason,
        status=reg.status, review_comment=reg.review_comment,
        reviewed_at=reg.reviewed_at, created_at=reg.created_at,
    )


@router.get("/regularize", response_model=List[RegularizationOut])
def list_regularizations(
    scope: str = Query(default="my"),  # my | team
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = db.query(RegularizationRequest).filter(
        RegularizationRequest.company_id == user.company_id
    )
    if scope == "team":
        if not _is_hr(user):
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        q = q.filter(RegularizationRequest.user_id == user.id)
    regs = q.order_by(RegularizationRequest.created_at.desc()).all()
    names = _name_map(db, user.company_id)
    return [
        RegularizationOut(
            id=r.id, employee_id=r.employee_id, employee_name=names.get(r.employee_id),
            work_date=r.work_date, requested_check_in=r.requested_check_in,
            requested_check_out=r.requested_check_out, reason=r.reason,
            status=r.status, review_comment=r.review_comment,
            reviewed_at=r.reviewed_at, created_at=r.created_at,
        )
        for r in regs
    ]


def _apply_regularization(db: Session, reg: RegularizationRequest):
    """Update or create the attendance log based on approved regularization."""
    log = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.user_id == reg.user_id,
            AttendanceLog.work_date == reg.work_date,
        )
        .first()
    )
    if not log:
        log = AttendanceLog(
            company_id=reg.company_id,
            user_id=reg.user_id,
            employee_id=reg.employee_id,
            work_date=reg.work_date,
            status=ATT_PRESENT,
        )
        db.add(log)
    if reg.requested_check_in:
        log.check_in_at = reg.requested_check_in
    if reg.requested_check_out:
        log.check_out_at = reg.requested_check_out
    log.is_regularized = True
    log.regularize_note = reg.reason
    log.status = ATT_PRESENT


@router.put("/regularize/{reg_id}/approve", response_model=RegularizationOut)
def approve_regularization(
    reg_id: str,
    payload: RegularizationReview,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    reg = db.query(RegularizationRequest).filter(
        RegularizationRequest.id == reg_id,
        RegularizationRequest.company_id == user.company_id,
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Request not found")
    if reg.status != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")
    reg.status = "approved"
    reg.reviewed_by = user.id
    reg.review_comment = payload.comment
    reg.reviewed_at = datetime.now()
    _apply_regularization(db, reg)
    db.commit()
    db.refresh(reg)
    names = _name_map(db, user.company_id)
    return RegularizationOut(
        id=reg.id, employee_id=reg.employee_id, employee_name=names.get(reg.employee_id),
        work_date=reg.work_date, requested_check_in=reg.requested_check_in,
        requested_check_out=reg.requested_check_out, reason=reg.reason,
        status=reg.status, review_comment=reg.review_comment,
        reviewed_at=reg.reviewed_at, created_at=reg.created_at,
    )


@router.put("/regularize/{reg_id}/reject", response_model=RegularizationOut)
def reject_regularization(
    reg_id: str,
    payload: RegularizationReview,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not _is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    reg = db.query(RegularizationRequest).filter(
        RegularizationRequest.id == reg_id,
        RegularizationRequest.company_id == user.company_id,
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Request not found")
    if reg.status != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")
    reg.status = "rejected"
    reg.reviewed_by = user.id
    reg.review_comment = payload.comment
    reg.reviewed_at = datetime.now()
    db.commit()
    db.refresh(reg)
    names = _name_map(db, user.company_id)
    return RegularizationOut(
        id=reg.id, employee_id=reg.employee_id, employee_name=names.get(reg.employee_id),
        work_date=reg.work_date, requested_check_in=reg.requested_check_in,
        requested_check_out=reg.requested_check_out, reason=reg.reason,
        status=reg.status, review_comment=reg.review_comment,
        reviewed_at=reg.reviewed_at, created_at=reg.created_at,
    )
