import datetime as dt
from app.database import SessionLocal
import app.models as M

db = SessionLocal()
company = db.query(M.Company).first()
TODAY = dt.date(2026, 6, 24)
emps = db.query(M.Employee).filter(M.Employee.work_email.like("%@test.com")).all()
emp_by_id = {e.id: e for e in emps}
ltypes = {t.id: t for t in db.query(M.LeaveType).filter(M.LeaveType.company_id == company.id)}

def name(e): return f"{e.first_name} {e.last_name}"

print("=" * 64)
print("  HRMS — FULL SCENARIO TEST REPORT  (as of Wed 24-Jun-2026)")
print("=" * 64)

# ── 1. ROSTER ──
print("\n[1] EMPLOYEES (each has a login: <email> / Welcome@123)")
for e in sorted(emps, key=lambda x: x.emp_code):
    print(f"    {e.emp_code}  {name(e):14}  {e.work_email}")

# ── 2. TODAY DASHBOARD KPIs ──
today_logs = db.query(M.AttendanceLog).filter(
    M.AttendanceLog.company_id == company.id, M.AttendanceLog.work_date == TODAY).all()
present = [l for l in today_logs if l.status in ("Present", "Half_Day")]
onleave = [l for l in today_logs if l.status == "On_Leave"]
active = db.query(M.Employee).filter(M.Employee.company_id == company.id, M.Employee.status == "Active").count()
print("\n[2] TODAY's DASHBOARD KPIs (live attendance)")
print(f"    Active employees : {active}")
print(f"    Present today    : {len(present)}  -> " + ", ".join(name(emp_by_id[l.employee_id]) for l in present if l.employee_id in emp_by_id))
print(f"    On leave today   : {len(onleave)}")
test_present = [l for l in present if l.employee_id in emp_by_id]
absent_test = [e for e in emps if e.id not in {l.employee_id for l in today_logs}]
print(f"    (test) absent    : " + ", ".join(name(e) for e in absent_test))

# ── 3. PER-EMPLOYEE JUNE ATTENDANCE SUMMARY ──
print("\n[3] JUNE ATTENDANCE SUMMARY (per employee)")
print(f"    {'Name':14} {'Pres':>4} {'Abs':>4} {'Half':>4} {'Leave':>5} {'Late':>4} {'OT(h)':>6}")
for e in sorted(emps, key=lambda x: x.emp_code):
    logs = db.query(M.AttendanceLog).filter(
        M.AttendanceLog.employee_id == e.id,
        M.AttendanceLog.work_date >= dt.date(2026,6,1),
        M.AttendanceLog.work_date <= dt.date(2026,6,30)).all()
    p = sum(1 for l in logs if l.status == "Present")
    ab = sum(1 for l in logs if l.status == "Absent")
    hf = sum(1 for l in logs if l.status == "Half_Day")
    lv = sum(1 for l in logs if l.status == "On_Leave")
    late = sum(1 for l in logs if (l.late_minutes or 0) > 0)
    ot = round(sum(l.overtime_hours or 0 for l in logs), 1)
    print(f"    {name(e):14} {p:>4} {ab:>4} {hf:>4} {lv:>5} {late:>4} {ot:>6}")

# ── 4. LEAVE REQUESTS (all states) ──
print("\n[4] LEAVE REQUESTS (every state)")
reqs = db.query(M.LeaveRequest).filter(M.LeaveRequest.employee_id.in_([e.id for e in emps])).order_by(M.LeaveRequest.status).all()
for r in reqs:
    e = emp_by_id[r.employee_id]; lt = ltypes[r.leave_type_id]
    rng = f"{r.from_date}" + ("" if r.from_date == r.to_date else f"..{r.to_date}")
    half = " (half)" if r.half_day else ""
    print(f"    {name(e):14} {lt.code:3} {rng:24} {r.days_count}d{half:7} [{r.status.upper()}]")

# ── 5. LEAVE BALANCES ──
print("\n[5] LEAVE BALANCES (after all scenarios)")
print(f"    {'Name':14} {'Type':5} {'Alloc':>5} {'Used':>5} {'Pend':>5} {'Avail':>6}")
for e in sorted(emps, key=lambda x: x.emp_code):
    bals = db.query(M.LeaveBalance).filter(M.LeaveBalance.employee_id == e.id).all()
    for b in bals:
        if b.used or b.pending:
            lt = ltypes[b.leave_type_id]
            print(f"    {name(e):14} {lt.code:5} {b.allocated:>5} {b.used:>5} {b.pending:>5} {b.available:>6}")

# ── 6. INTEGRITY CHECKS ──
print("\n[6] INTEGRITY CHECKS")
checks = []
# approved leaves have matching On_Leave/Half_Day attendance
appr = [r for r in reqs if r.status == "approved"]
for r in appr:
    cnt = db.query(M.AttendanceLog).filter(M.AttendanceLog.leave_request_id == r.id).count()
    ok = cnt == int(r.days_count) or (r.half_day and cnt == 1)
    checks.append((f"approved leave {emp_by_id[r.employee_id].first_name} -> {cnt} attendance rows", ok))
# pending leaves reserve balance
pend = [r for r in reqs if r.status == "pending"]
for r in pend:
    b = db.query(M.LeaveBalance).filter(M.LeaveBalance.employee_id == r.employee_id,
        M.LeaveBalance.leave_type_id == r.leave_type_id).first()
    checks.append((f"pending leave {emp_by_id[r.employee_id].first_name} reserves {r.days_count}d -> pending={b.pending}", b.pending >= r.days_count))
# rejected leaves do NOT consume balance
rej = [r for r in reqs if r.status == "rejected"]
for r in rej:
    b = db.query(M.LeaveBalance).filter(M.LeaveBalance.employee_id == r.employee_id,
        M.LeaveBalance.leave_type_id == r.leave_type_id).first()
    used = b.used if b else 0
    checks.append((f"rejected leave {emp_by_id[r.employee_id].first_name} consumes nothing", used == 0))
for desc, ok in checks:
    print(f"    [{'PASS' if ok else 'FAIL'}] {desc}")

print("\n" + "=" * 64)
print(f"  RESULT: {sum(1 for _,ok in checks if ok)}/{len(checks)} integrity checks passed")
print("=" * 64)
db.close()
