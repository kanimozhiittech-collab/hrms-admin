from datetime import date

from .database import SessionLocal
from .models import (
    Company, Department, Designation, WorkLocation, Shift, User,
    LeaveType, Holiday,
)
from .core.security import hash_password

DEPTS = ["Engineering", "Product", "Design", "Human Resources", "Finance", "Marketing", "Sales", "Operations"]
DESIGS = ["Software Engineer","Senior Engineer","Engineering Manager","Product Manager",
          "UX Designer","HR Executive","Accountant","Marketing Lead","Sales Manager","Operations Analyst"]

# (name, code, days/yr, accrual, carry_forward, max_carry, encashable, half_day, color)
LEAVE_TYPES = [
    ("Casual Leave",  "CL", 12, "monthly",   False, None, False, True,  "#2563EB"),
    ("Sick Leave",    "SL", 10, "upfront",   False, None, False, True,  "#16A34A"),
    ("Earned Leave",  "EL", 15, "monthly",   True,  30,   True,  True,  "#7C3AED"),
    ("Comp Off",      "CO", 0,  "upfront",   False, None, False, True,  "#0D9488"),
    ("Loss of Pay",   "LOP",0,  "upfront",   False, None, False, True,  "#DC2626"),
]

# (name, MM, DD, type) for the current year
HOLIDAYS = [
    ("New Year's Day",      1, 1,  "national"),
    ("Republic Day",        1, 26, "national"),
    ("Independence Day",    8, 15, "national"),
    ("Gandhi Jayanti",      10, 2, "national"),
    ("Diwali",              11, 4, "optional"),
    ("Christmas",           12, 25,"national"),
]


def _add_leave_types(db, company_id):
    for (name, code, days, accrual, cf, maxc, enc, half, color) in LEAVE_TYPES:
        db.add(LeaveType(
            company_id=company_id, name=name, code=code, days_per_year=days,
            accrual_type=accrual, carry_forward=cf, max_carry_days=maxc,
            encashable=enc, allow_half_day=half, color=color,
            requires_approval=True, is_paid=(code != "LOP"),
        ))


def _add_holidays(db, company_id):
    year = date.today().year
    for (name, mm, dd, htype) in HOLIDAYS:
        db.add(Holiday(
            company_id=company_id, name=name,
            holiday_date=date(year, mm, dd), holiday_type=htype,
        ))


def seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Company).first():
            return
        c = Company(name="HRMS Demo", subdomain="demo")
        db.add(c); db.flush()

        dept_objs = {n: Department(company_id=c.id, name=n) for n in DEPTS}
        desig_objs = {t: Designation(company_id=c.id, title=t) for t in DESIGS}
        db.add_all(dept_objs.values()); db.add_all(desig_objs.values())
        db.add(WorkLocation(company_id=c.id, name="Chennai HQ"))
        db.add(Shift(company_id=c.id, name="General", start_time="09:30", end_time="18:30"))
        _add_leave_types(db, c.id)
        _add_holidays(db, c.id)
        db.flush()

        admin = User(company_id=c.id, email="admin@peoplepulse.io",
                     password_hash=hash_password("Admin@123"), role="company_admin")
        db.add(admin)

        db.commit()
        print("[seed] demo organization inserted")
    finally:
        db.close()


def ensure_defaults():
    """Idempotent: backfill leave types & holidays for companies that lack them.

    Runs on every startup so databases created before these features were added
    still get the default leave types and holiday calendar.
    """
    db = SessionLocal()
    try:
        for c in db.query(Company).all():
            if not db.query(LeaveType).filter(LeaveType.company_id == c.id).first():
                _add_leave_types(db, c.id)
                print(f"[seed] backfilled leave types for company {c.name}")
            year = date.today().year
            has_holiday = db.query(Holiday).filter(
                Holiday.company_id == c.id,
                Holiday.holiday_date >= date(year, 1, 1),
            ).first()
            if not has_holiday:
                _add_holidays(db, c.id)
                print(f"[seed] backfilled holidays for company {c.name}")
        db.commit()
    finally:
        db.close()
