from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from ..database import get_db
from ..models import AttendanceLog, Company, Employee, Department, Designation, Shift, User
from ..models.attendance import ATT_PRESENT
from ..core.worktime import compute_log_metrics
from ..schemas import DashboardStats
from ..schemas.dashboard import (
    Activity,
    AttendancePoint,
    DashboardOverview,
    DeptCount,
    GrowthPoint,
    OverviewActivity,
    OverviewModuleState,
    OverviewProfile,
    OverviewProfileDetails,
    OverviewShift,
    OverviewTimeLogs,
    OverviewWeekDay,
)
from .deps import current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

OVERVIEW_TABS = [
    "Activities",
    "Feeds",
    "Profile",
    "Approvals",
    "Leave",
    "Attendance",
    "Time Logs",
    "Timesheets",
    "Jobs",
    "Files",
    "Career History",
    "Goals",
    "Feedback",
]

def _display_name(user: User, employee: Employee | None) -> str:
    if employee:
        return employee.display_name or f"{employee.first_name} {employee.last_name}".strip()
    return user.email.split("@")[0].replace(".", " ").replace("_", " ").title()

def _shift_display(shift: Shift | None) -> OverviewShift:
    name = shift.name if shift else "General"
    start = shift.start_time if shift else "09:00"
    end = shift.end_time if shift else "18:00"
    return OverviewShift(
        name=name,
        start_time=start,
        end_time=end,
        display=f"{name} ({start} - {end})",
    )

def _week_rows(today: date) -> tuple[str, str, list[OverviewWeekDay]]:
    start = today - timedelta(days=(today.weekday() + 1) % 7)
    rows: list[OverviewWeekDay] = []
    for index in range(7):
        current = start + timedelta(days=index)
        is_weekend = current.weekday() in (5, 6)
        note = "Weekend" if is_weekend else None
        tone = "bg-amber-50 text-amber-600" if is_weekend else ""
        rows.append(
            OverviewWeekDay(
                day=current.strftime("%a"),
                date=str(current.day),
                note=note,
                tone=tone,
                is_today=current == today,
            )
        )
    return start.strftime("%d-%b-%Y"), (start + timedelta(days=6)).strftime("%d-%b-%Y"), rows

def _today_log(db: Session, user: User, today: date) -> AttendanceLog | None:
    return (
        db.query(AttendanceLog)
        .filter(AttendanceLog.user_id == user.id, AttendanceLog.work_date == today)
        .first()
    )

def _timer_from_log(log: AttendanceLog | None, now: datetime) -> list[str]:
    if not log:
        return ["00", "00", "00"]
    delta = now - log.check_in_at
    seconds = max(int(delta.total_seconds()), 0)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return [f"{hours:02d}", f"{minutes:02d}", f"{secs:02d}"]

def _overview_payload(db: Session, user: User) -> DashboardOverview:
    employee = None
    if user.employee_id:
        employee = db.query(Employee).filter(Employee.id == user.employee_id, Employee.company_id == user.company_id).first()
    if not employee:
        employee = db.query(Employee).filter(Employee.company_id == user.company_id, Employee.work_email == user.email).first()

    company = db.get(Company, user.company_id)
    shift = db.query(Shift).filter(Shift.company_id == user.company_id).first()
    designation = None
    if employee and employee.designation_id:
        designation = db.get(Designation, employee.designation_id)

    today = date.today()
    now = datetime.now()
    log = _today_log(db, user, today)
    week_start, week_end, week = _week_rows(today)
    shift_info = _shift_display(shift)
    name = _display_name(user, employee)
    role = designation.title if designation else user.role.replace("_", " ").title()
    # Admin logins have no employee code of their own — show their role instead
    # of a bare "Admin" label so the profile card doesn't read "Admin - admin".
    employee_code = employee.emp_code if employee else role
    checked_in_at = log.check_in_at.strftime("%I:%M %p") if log else None
    checked_out_at = log.check_out_at.strftime("%I:%M %p") if log and log.check_out_at else None
    if not log:
        status_text = "Yet to check-in"
        button_text = "Check-in"
        attendance_action = "check_in"
        can_check_in = True
    elif not log.check_out_at:
        status_text = f"Checked-in at {checked_in_at}"
        button_text = "Check-out"
        attendance_action = "check_out"
        can_check_in = True
    else:
        status_text = f"Checked-out at {checked_out_at}"
        button_text = "Check-in"
        attendance_action = "check_in"
        can_check_in = True

    return DashboardOverview(
        tabs=OVERVIEW_TABS,
        profile=OverviewProfile(
            employee_code=employee_code,
            name=name,
            email=user.email,
            status_text=status_text,
            timer=_timer_from_log(log, now),
            can_check_in=can_check_in,
            checked_in_at=checked_in_at,
            checked_out_at=checked_out_at,
            check_in_button=button_text,
            attendance_action=attendance_action,
        ),
        shift=shift_info,
        week_start=week_start,
        week_end=week_end,
        week=week,
        activity=OverviewActivity(
            greeting="Good Morning",
            person_name=name,
            message="Have a productive day!",
            reminder_title="Check-in reminder" if not log else "Attendance updated",
            reminder_text="Your shift has already started" if not log else status_text,
            time_log_message="You are yet to submit your time logs today!",
        ),
        profile_details=OverviewProfileDetails(
            timezone="India Standard Time (GMT+05:30)",
            about_text=f"{role} at {company.name if company else 'your organization'}",
            tags=[],
        ),
        time_logs=OverviewTimeLogs(
            projects=[],
            jobs=[],
            selected_billable="Billable",
            timer="00:00:00",
            empty_state="No time logs added for today",
        ),
        modules={
            tab: OverviewModuleState(title=tab, empty_state=f"No {tab.lower()} available", count=0)
            for tab in OVERVIEW_TABS
            if tab not in {"Activities", "Profile", "Attendance", "Time Logs"}
        },
    )

@router.get("", response_model=DashboardStats)
def stats(db: Session = Depends(get_db), user: User = Depends(current_user)):
    cid = user.company_id
    total = db.query(Employee).filter(Employee.company_id == cid).count()
    on_leave = db.query(Employee).filter(Employee.company_id == cid, Employee.status == "On Leave").count()
    active = db.query(Employee).filter(Employee.company_id == cid, Employee.status == "Active").count()
    departments = db.query(Department).filter(Department.company_id == cid).count()

    # by department
    rows = (db.query(Department.name, func.count(Employee.id))
              .outerjoin(Employee, Employee.department_id == Department.id)
              .filter(Department.company_id == cid)
              .group_by(Department.name).all())
    by_dept = [DeptCount(department=n or "Unassigned", count=c) for n, c in rows]

    # employee growth (last 6 months by joining date)
    now = datetime.utcnow()
    growth = []
    for i in range(5, -1, -1):
        m = (now.replace(day=1) - timedelta(days=30*i))
        label = m.strftime("%b")
        cnt = db.query(Employee).filter(
            Employee.company_id == cid,
            Employee.date_of_joining != None,
            func.extract('month', Employee.date_of_joining) == m.month,
            func.extract('year', Employee.date_of_joining) == m.year,
        ).count()
        growth.append(GrowthPoint(month=label, count=cnt))

    # ── real attendance from AttendanceLog ──
    today = date.today()
    today_logs = db.query(AttendanceLog).filter(
        AttendanceLog.company_id == cid, AttendanceLog.work_date == today
    ).all()
    present_today = sum(1 for l in today_logs if l.status in ("Present", "Half_Day"))
    on_leave_today = sum(1 for l in today_logs if l.status == "On_Leave")
    # absent = active employees who have no present/leave log today
    accounted = present_today + on_leave_today
    absent_today = max(active - accounted, 0)

    # weekly attendance chart (last 5 working days incl. today)
    attendance = []
    cursor = today
    collected = []
    while len(collected) < 5:
        if cursor.weekday() < 5:  # Mon–Fri
            collected.append(cursor)
        cursor -= timedelta(days=1)
    for d in reversed(collected):
        day_logs = db.query(AttendanceLog).filter(
            AttendanceLog.company_id == cid, AttendanceLog.work_date == d
        ).all()
        p = sum(1 for l in day_logs if l.status in ("Present", "Half_Day"))
        lv = sum(1 for l in day_logs if l.status == "On_Leave")
        ab = max(active - p - lv, 0)
        attendance.append(AttendancePoint(day=d.strftime("%a"), present=p, absent=ab, leave=lv))

    # recent activity
    recent = (db.query(Employee).filter(Employee.company_id == cid)
              .order_by(Employee.created_at.desc()).limit(5).all())
    activity = [Activity(id=e.id,
                         text=f"{e.first_name} {e.last_name} was added to {by_dept and 'the team' or 'team'}",
                         when=str(e.created_at)) for e in recent]

    return DashboardStats(
        total_employees=total,
        present_today=present_today,
        absent_today=absent_today,
        on_leave=on_leave_today,
        departments=departments,
        by_department=by_dept,
        growth=growth,
        attendance=attendance,
        recent_activity=activity,
    )

@router.get("/overview", response_model=DashboardOverview)
def overview(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return _overview_payload(db, user)

def _apply_metrics(db: Session, log: AttendanceLog, user: User):
    """Compute work_hours / overtime / late / early-exit from the company shift."""
    shift = db.query(Shift).filter(Shift.company_id == user.company_id).first()
    start = shift.start_time if shift else "09:00"
    end = shift.end_time if shift else "18:00"
    metrics = compute_log_metrics(
        log.check_in_at, log.check_out_at, start, end, log.work_date
    )
    log.work_hours = metrics["work_hours"]
    log.overtime_hours = metrics["overtime_hours"]
    log.late_minutes = metrics["late_minutes"]
    log.early_exit_minutes = metrics["early_exit_minutes"]


@router.post("/check-in", response_model=DashboardOverview)
def check_in(db: Session = Depends(get_db), user: User = Depends(current_user)):
    today = date.today()
    now = datetime.now()
    log = _today_log(db, user, today)
    if not log:
        log = AttendanceLog(
            company_id=user.company_id,
            user_id=user.id,
            employee_id=user.employee_id,
            work_date=today,
            check_in_at=now,
            status=ATT_PRESENT,
            source="web",
        )
        db.add(log)
        _apply_metrics(db, log, user)
        db.commit()
    elif not log.check_out_at:
        log.check_out_at = now
        _apply_metrics(db, log, user)
        db.commit()
    else:
        log.check_in_at = now
        log.check_out_at = None
        log.status = ATT_PRESENT
        _apply_metrics(db, log, user)
        db.commit()
    return _overview_payload(db, user)
