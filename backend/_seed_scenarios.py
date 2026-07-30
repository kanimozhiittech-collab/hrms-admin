"""One-time rich scenario seeder for demo/testing.
Creates 6 employees (with logins), a month of varied attendance, and leave
requests in every state. Idempotent: wipes prior @test.com data and rebuilds.
"""
import datetime as dt

from app.database import SessionLocal
import app.models as M
from app.core.security import hash_password
from app.core.worktime import compute_log_metrics

SHIFT_START, SHIFT_END = "09:30", "18:30"
TODAY = dt.date(2026, 6, 24)  # Wed
YEAR = 2026
PWD = "Welcome@123"

db = SessionLocal()
company = db.query(M.Company).first()
admin = db.query(M.User).filter(M.User.role == "company_admin").first()
depts = {d.name: d.id for d in db.query(M.Department).filter(M.Department.company_id == company.id)}
desigs = {d.title: d.id for d in db.query(M.Designation).filter(M.Designation.company_id == company.id)}
ltypes = {t.code: t for t in db.query(M.LeaveType).filter(M.LeaveType.company_id == company.id)}
holidays = {h.holiday_date for h in db.query(M.Holiday).filter(M.Holiday.company_id == company.id)}

# ── roster ──
ROSTER = [
    ("EMP100", "Priya", "Devi", "priya@test.com", "Engineering", "Software Engineer"),
    ("EMP101", "Arjun", "Kumar", "arjun@test.com", "Engineering", "Engineering Manager"),
    ("EMP102", "Karthik", "M", "karthik@test.com", "Engineering", "Senior Engineer"),
    ("EMP103", "Meera", "S", "meera@test.com", "Design", "UX Designer"),
    ("EMP104", "Vikram", "R", "vikram@test.com", "Sales", "Sales Manager"),
    ("EMP105", "Divya", "N", "divya@test.com", "Human Resources", "HR Executive"),
]
EMAILS = [r[3] for r in ROSTER]

# ── wipe prior test data ──
old_emps = db.query(M.Employee).filter(M.Employee.work_email.in_(EMAILS)).all()
old_ids = [e.id for e in old_emps]
old_users = db.query(M.User).filter(M.User.email.in_(EMAILS)).all()
old_uids = [u.id for u in old_users]
if old_ids:
    db.query(M.AttendanceLog).filter(M.AttendanceLog.employee_id.in_(old_ids)).delete(synchronize_session=False)
    db.query(M.LeaveRequest).filter(M.LeaveRequest.employee_id.in_(old_ids)).delete(synchronize_session=False)
    db.query(M.LeaveBalance).filter(M.LeaveBalance.employee_id.in_(old_ids)).delete(synchronize_session=False)
    db.query(M.RegularizationRequest).filter(M.RegularizationRequest.employee_id.in_(old_ids)).delete(synchronize_session=False)
if old_uids:
    db.query(M.User).filter(M.User.id.in_(old_uids)).delete(synchronize_session=False)
if old_ids:
    db.query(M.Employee).filter(M.Employee.id.in_(old_ids)).delete(synchronize_session=False)
db.commit()

# ── create employees + logins ──
emp = {}   # email -> Employee
usr = {}   # email -> User
for code, fn, ln, email, dept, desig in ROSTER:
    e = M.Employee(
        company_id=company.id, emp_code=code, first_name=fn, last_name=ln,
        display_name=f"{fn} {ln}", work_email=email, employee_type="Permanent",
        status="Active", date_of_joining=dt.date(2025, 1, 10),
        department_id=depts.get(dept), designation_id=desigs.get(desig),
    )
    db.add(e); db.flush()
    u = M.User(company_id=company.id, email=email, password_hash=hash_password(PWD),
               role="employee", employee_id=e.id)
    db.add(u); db.flush()
    emp[email] = e; usr[email] = u
db.commit()


def workdays(start, end):
    out, c = [], start
    while c <= end:
        if c.weekday() < 5 and c not in holidays:
            out.append(c)
        c += dt.timedelta(days=1)
    return out


def get_bal(e, lt):
    b = db.query(M.LeaveBalance).filter(
        M.LeaveBalance.employee_id == e.id, M.LeaveBalance.leave_type_id == lt.id,
        M.LeaveBalance.year == YEAR).first()
    if not b:
        b = M.LeaveBalance(company_id=company.id, employee_id=e.id, leave_type_id=lt.id,
                           year=YEAR, allocated=lt.days_per_year)
        db.add(b); db.flush()
    return b


def mklog(e, u, d, cin, cout, status="Present", leave_request_id=None):
    ci = dt.datetime.combine(d, cin) if cin else None
    co = dt.datetime.combine(d, cout) if cout else None
    m = compute_log_metrics(ci, co, SHIFT_START, SHIFT_END, d)
    db.add(M.AttendanceLog(
        company_id=company.id, user_id=u.id, employee_id=e.id, work_date=d,
        check_in_at=ci, check_out_at=co, status=status,
        work_hours=m["work_hours"], overtime_hours=m["overtime_hours"],
        late_minutes=m["late_minutes"], early_exit_minutes=m["early_exit_minutes"],
        leave_request_id=leave_request_id, source="seed"))


def approved_leave(e, u, lt, frm, to, half=False, reason="Leave"):
    days = 0.5 if half else float(len(workdays(frm, to)))
    req = M.LeaveRequest(company_id=company.id, employee_id=e.id, user_id=u.id,
                         leave_type_id=lt.id, from_date=frm, to_date=to, half_day=half,
                         days_count=days, reason=reason, status="approved",
                         reviewed_by=admin.id, reviewed_at=dt.datetime.now())
    db.add(req); db.flush()
    b = get_bal(e, lt); b.used += days
    for d in workdays(frm, to):
        mklog(e, u, d, None, None, "Half_Day" if half else "On_Leave", leave_request_id=req.id)
    return req


def pending_leave(e, u, lt, frm, to, reason="Leave"):
    days = float(len(workdays(frm, to)))
    req = M.LeaveRequest(company_id=company.id, employee_id=e.id, user_id=u.id,
                         leave_type_id=lt.id, from_date=frm, to_date=to, half_day=False,
                         days_count=days, reason=reason, status="pending")
    db.add(req); db.flush()
    b = get_bal(e, lt); b.pending += days
    return req


def rejected_leave(e, u, lt, frm, to, reason="Leave"):
    days = float(len(workdays(frm, to)))
    db.add(M.LeaveRequest(company_id=company.id, employee_id=e.id, user_id=u.id,
                          leave_type_id=lt.id, from_date=frm, to_date=to, half_day=False,
                          days_count=days, reason=reason, status="rejected",
                          reviewed_by=admin.id, review_comment="Project deadline",
                          reviewed_at=dt.datetime.now()))


# ── per-employee scenarios ──
T = dt.time
mon_start = dt.date(2026, 6, 1)
hist_end = dt.date(2026, 6, 23)   # up to yesterday; today handled separately

# leave days to skip from normal attendance, per email
leave_days = {e: set() for e in EMAILS}

# Priya: approved Casual on Jun 12
r = approved_leave(emp["priya@test.com"], usr["priya@test.com"], ltypes["CL"], dt.date(2026,6,12), dt.date(2026,6,12), reason="Family function")
leave_days["priya@test.com"].add(dt.date(2026,6,12))
# Arjun: approved Earned Jun 18-19
approved_leave(emp["arjun@test.com"], usr["arjun@test.com"], ltypes["EL"], dt.date(2026,6,18), dt.date(2026,6,19), reason="Vacation")
leave_days["arjun@test.com"].update([dt.date(2026,6,18), dt.date(2026,6,19)])
# Vikram: approved half-day Casual Jun 23
approved_leave(emp["vikram@test.com"], usr["vikram@test.com"], ltypes["CL"], dt.date(2026,6,23), dt.date(2026,6,23), half=True, reason="Bank work")
leave_days["vikram@test.com"].add(dt.date(2026,6,23))
# Karthik: PENDING Casual Jun 26-27
pending_leave(emp["karthik@test.com"], usr["karthik@test.com"], ltypes["CL"], dt.date(2026,6,26), dt.date(2026,6,27), reason="Wedding")
# Divya: PENDING Earned Jun 29-30
pending_leave(emp["divya@test.com"], usr["divya@test.com"], ltypes["EL"], dt.date(2026,6,29), dt.date(2026,6,30), reason="Trip")
# Meera: REJECTED Sick Jun 16
rejected_leave(emp["meera@test.com"], usr["meera@test.com"], ltypes["SL"], dt.date(2026,6,16), dt.date(2026,6,16), reason="Not feeling well")

# normal daily times per employee (cin, cout)
PATTERN = {
    "priya@test.com":  (T(9,28), T(18,33)),   # punctual
    "arjun@test.com":  (T(9,20), T(19,15)),   # early + overtime
    "karthik@test.com":(T(9,52), T(19,40)),   # habitually late + OT
    "meera@test.com":  (T(9,31), T(18,30)),   # normal
    "vikram@test.com": (T(9,26), T(18,32)),   # normal
    "divya@test.com":  (T(9,18), T(18,40)),   # perfect
}
# special overrides: date -> (cin, cout, status) or ("ABSENT",)
SPECIAL = {
    "meera@test.com": {
        dt.date(2026,6,10): (T(9,30), T(13,30), "Half_Day"),
        dt.date(2026,6,17): ("ABSENT",),
    },
    "vikram@test.com": {
        dt.date(2026,6,5):  ("ABSENT",),
        dt.date(2026,6,11): ("ABSENT",),
    },
}

for email in EMAILS:
    e, u = emp[email], usr[email]
    cin, cout = PATTERN[email]
    for d in workdays(mon_start, hist_end):
        if d in leave_days[email]:
            continue  # already an On_Leave/Half_Day log
        sp = SPECIAL.get(email, {}).get(d)
        if sp:
            if sp[0] == "ABSENT":
                mklog(e, u, d, None, None, "Absent")
            else:
                mklog(e, u, d, sp[0], sp[1], sp[2])
        else:
            mklog(e, u, d, cin, cout, "Present")

# ── TODAY (Jun 24) check-in states ──
# Priya, Arjun, Karthik, Divya = checked in (still working, no checkout)
mklog(emp["priya@test.com"], usr["priya@test.com"], TODAY, T(9,27), None, "Present")
mklog(emp["arjun@test.com"], usr["arjun@test.com"], TODAY, T(9,19), None, "Present")
mklog(emp["karthik@test.com"], usr["karthik@test.com"], TODAY, T(9,58), None, "Present")  # late today
mklog(emp["divya@test.com"], usr["divya@test.com"], TODAY, T(9,16), None, "Present")
# Meera = full day done (left early)
mklog(emp["meera@test.com"], usr["meera@test.com"], TODAY, T(9,30), T(17,45), "Present")
# Vikram = absent today (no log)

db.commit()
print("Scenario data committed.")
db.close()
