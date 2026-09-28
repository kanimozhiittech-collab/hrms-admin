from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
import json

from ..database import get_db
from ..models import PayrollSettings, SalaryComponent, PTSlab, Employee, User, PayrollRun, PayrollEntry, Department
from ..schemas import (
    PayrollSettingsIn, PayrollSettingsOut,
    SalaryComponentIn, SalaryComponentOut,
    PTSlabIn, PTSlabOut,
    EmployeeSalaryIn, EmployeeSalaryOut,
    PayrollDashboardOut, PayrollRunSummaryOut, PayrollRunCreateIn,
    PayrollEntryOut, PayrollEntryUpdateIn, PayrollRunOut,
)
from ..payroll_calc import compute_salary_breakup, compute_payroll_entry
from ..payroll_dates import working_days_in_month
from .deps import current_user

router = APIRouter(prefix="/api/payroll", tags=["payroll"])

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}
ADMIN_ROLES = {"super_admin", "company_admin"}

# Only Tamil Nadu's slabs are given in the spec with verified figures — other
# states' PT slabs vary and must be entered by the admin rather than guessed.
DEFAULT_PT_SLABS = {
    "Tamil Nadu": [
        (0, 21000, 0),
        (21001, 30000, 100),
        (30001, 45000, 235),
        (45001, 60000, 510),
        (60001, 75000, 760),
        (75001, None, 1095),
    ],
}


def _require_hr(user: User):
    if user.role not in HR_ROLES:
        raise HTTPException(403, "Not authorized")


def _require_admin(user: User):
    if user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Only company admins can delete this")


def _get_or_create_settings(db: Session, company_id: str) -> PayrollSettings:
    row = db.query(PayrollSettings).filter(PayrollSettings.company_id == company_id).first()
    if not row:
        row = PayrollSettings(company_id=company_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


# ---------------- Master: Settings (Pay Schedule + Statutory) ----------------

@router.get("/master/settings", response_model=PayrollSettingsOut)
def get_settings(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return _get_or_create_settings(db, user.company_id)


@router.put("/master/settings", response_model=PayrollSettingsOut)
def update_settings(body: PayrollSettingsIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    row = _get_or_create_settings(db, user.company_id)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


# ---------------- Master: Salary Components ----------------

@router.get("/master/components", response_model=List[SalaryComponentOut])
def list_components(
    category: Optional[str] = None,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    qry = db.query(SalaryComponent).filter(SalaryComponent.company_id == user.company_id)
    if category:
        qry = qry.filter(SalaryComponent.category == category.upper())
    return qry.order_by(SalaryComponent.category, SalaryComponent.sort_order).all()


@router.post("/master/components", response_model=SalaryComponentOut)
def create_component(body: SalaryComponentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    row = SalaryComponent(company_id=user.company_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/master/components/{component_id}", response_model=SalaryComponentOut)
def update_component(component_id: str, body: SalaryComponentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    row = db.query(SalaryComponent).filter(
        SalaryComponent.id == component_id, SalaryComponent.company_id == user.company_id
    ).first()
    if not row:
        raise HTTPException(404, "Salary component not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/master/components/{component_id}", status_code=204)
def delete_component(component_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    row = db.query(SalaryComponent).filter(
        SalaryComponent.id == component_id, SalaryComponent.company_id == user.company_id
    ).first()
    if not row:
        return None
    try:
        db.delete(row)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "This component is in use and cannot be deleted")
    return None


# ---------------- Master: PT Slabs ----------------

@router.get("/master/pt-slabs", response_model=List[PTSlabOut])
def list_pt_slabs(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(PTSlab).filter(PTSlab.company_id == user.company_id).order_by(PTSlab.salary_from).all()


@router.post("/master/pt-slabs", response_model=PTSlabOut)
def create_pt_slab(body: PTSlabIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    row = PTSlab(company_id=user.company_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/master/pt-slabs/{slab_id}", response_model=PTSlabOut)
def update_pt_slab(slab_id: str, body: PTSlabIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    row = db.query(PTSlab).filter(PTSlab.id == slab_id, PTSlab.company_id == user.company_id).first()
    if not row:
        raise HTTPException(404, "PT slab not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/master/pt-slabs/{slab_id}", status_code=204)
def delete_pt_slab(slab_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    row = db.query(PTSlab).filter(PTSlab.id == slab_id, PTSlab.company_id == user.company_id).first()
    if row:
        db.delete(row)
        db.commit()
    return None


@router.post("/master/pt-slabs/load-defaults", response_model=List[PTSlabOut])
def load_default_pt_slabs(state: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    defaults = DEFAULT_PT_SLABS.get(state)
    if not defaults:
        raise HTTPException(400, f"No built-in default PT slabs for {state} — add them manually below")
    db.query(PTSlab).filter(PTSlab.company_id == user.company_id).delete()
    rows = [PTSlab(company_id=user.company_id, salary_from=lo, salary_to=hi, pt_amount=amt) for lo, hi, amt in defaults]
    db.add_all(rows)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


# ---------------- Employee Salary ----------------

def _active_earning_components(db: Session, company_id: str) -> list[dict]:
    rows = (
        db.query(SalaryComponent)
        .filter(SalaryComponent.company_id == company_id, SalaryComponent.category == "EARNING", SalaryComponent.is_active == True)  # noqa: E712
        .order_by(SalaryComponent.sort_order)
        .all()
    )
    return [{"id": r.id, "name": r.name, "calc_type": r.calc_type, "value": r.value} for r in rows]


def _pt_slabs_for(db: Session, company_id: str) -> list[dict]:
    rows = db.query(PTSlab).filter(PTSlab.company_id == company_id).order_by(PTSlab.salary_from).all()
    return [{"salary_from": r.salary_from, "salary_to": r.salary_to, "pt_amount": r.pt_amount} for r in rows]


def _get_employee(db: Session, emp_id: str, user: User) -> Employee:
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e:
        raise HTTPException(404, "Employee not found")
    return e


def _salary_out(e: Employee, breakup: Optional[dict]) -> EmployeeSalaryOut:
    return EmployeeSalaryOut(
        employee_id=e.id, ctc=e.ctc, eps_contribute=e.eps_contribute, eps_actual_wages=e.eps_actual_wages,
        vpf_percentage=e.vpf_percentage or 0, pt_state_override=e.pt_state_override,
        monthly_gross=e.monthly_gross, is_esi_applicable=e.is_esi_applicable,
        breakup=breakup, pf_number=e.pf_number, uan_number=e.uan_number, esi_number=e.esi_number,
    )


@router.get("/employees/{emp_id}/salary", response_model=EmployeeSalaryOut)
def get_employee_salary(emp_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role not in HR_ROLES and user.employee_id != emp_id:
        raise HTTPException(403, "Not authorized")
    e = _get_employee(db, emp_id, user)
    breakup = json.loads(e.salary_breakup) if e.salary_breakup else None
    if breakup is None and e.ctc:
        settings = db.query(PayrollSettings).filter(PayrollSettings.company_id == user.company_id).first()
        breakup = compute_salary_breakup(
            ctc=e.ctc, earning_components=_active_earning_components(db, user.company_id),
            epf_employer_rate=float(settings.epf_employer_rate) if settings else 12.0,
            eps_contribute=e.eps_contribute, eps_actual_wages=e.eps_actual_wages,
            vpf_percentage=float(e.vpf_percentage or 0),
            pt_slabs=_pt_slabs_for(db, user.company_id),
        )
    return _salary_out(e, breakup)


@router.post("/employees/{emp_id}/salary/preview", response_model=EmployeeSalaryOut)
def preview_employee_salary(emp_id: str, body: EmployeeSalaryIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    e = _get_employee(db, emp_id, user)
    settings = db.query(PayrollSettings).filter(PayrollSettings.company_id == user.company_id).first()
    breakup = compute_salary_breakup(
        ctc=body.ctc or 0, earning_components=_active_earning_components(db, user.company_id),
        epf_employer_rate=float(settings.epf_employer_rate) if settings else 12.0,
        eps_contribute=body.eps_contribute, eps_actual_wages=body.eps_actual_wages,
        vpf_percentage=body.vpf_percentage, pt_slabs=_pt_slabs_for(db, user.company_id),
    )
    return EmployeeSalaryOut(
        employee_id=e.id, ctc=body.ctc, eps_contribute=body.eps_contribute, eps_actual_wages=body.eps_actual_wages,
        vpf_percentage=body.vpf_percentage, pt_state_override=body.pt_state_override,
        monthly_gross=breakup["monthly_gross"], is_esi_applicable=breakup["is_esi_applicable"],
        breakup=breakup, pf_number=e.pf_number, uan_number=e.uan_number, esi_number=e.esi_number,
    )


@router.put("/employees/{emp_id}/salary", response_model=EmployeeSalaryOut)
def update_employee_salary(emp_id: str, body: EmployeeSalaryIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    e = _get_employee(db, emp_id, user)
    settings = db.query(PayrollSettings).filter(PayrollSettings.company_id == user.company_id).first()
    breakup = compute_salary_breakup(
        ctc=body.ctc or 0, earning_components=_active_earning_components(db, user.company_id),
        epf_employer_rate=float(settings.epf_employer_rate) if settings else 12.0,
        eps_contribute=body.eps_contribute, eps_actual_wages=body.eps_actual_wages,
        vpf_percentage=body.vpf_percentage, pt_slabs=_pt_slabs_for(db, user.company_id),
    )
    e.ctc = body.ctc
    e.eps_contribute = body.eps_contribute
    e.eps_actual_wages = body.eps_actual_wages
    e.vpf_percentage = body.vpf_percentage
    e.pt_state_override = body.pt_state_override
    e.monthly_gross = breakup["monthly_gross"]
    e.is_esi_applicable = breakup["is_esi_applicable"]
    e.salary_breakup = json.dumps(breakup)
    db.commit()
    db.refresh(e)
    return _salary_out(e, breakup)


# ---------------- Payroll Dashboard & Runs ----------------

MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"]


@router.get("/dashboard", response_model=PayrollDashboardOut)
def get_dashboard(db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    settings = db.query(PayrollSettings).filter(PayrollSettings.company_id == user.company_id).first()
    employees = db.query(Employee).filter(Employee.company_id == user.company_id, Employee.status == "Active").all()
    runs = (
        db.query(PayrollRun)
        .filter(PayrollRun.company_id == user.company_id)
        .order_by(PayrollRun.year.desc(), PayrollRun.month.desc())
        .all()
    )
    run_summaries = []
    for r in runs:
        entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == r.id, PayrollEntry.is_included == True).all()  # noqa: E712
        run_summaries.append(PayrollRunSummaryOut(
            id=r.id, month=r.month, year=r.year, status=r.status,
            employee_count=len(entries),
            total_net_pay=float(sum(e.net_pay or 0 for e in entries)),
        ))
    return PayrollDashboardOut(
        settings_configured=bool(settings and settings.work_week and settings.pt_state),
        total_employees=len(employees),
        employees_with_salary=sum(1 for e in employees if e.salary_breakup),
        esi_applicable_count=sum(1 for e in employees if e.is_esi_applicable),
        runs=run_summaries,
    )


def _entry_out(entry: PayrollEntry, employee: Employee, dept_name: Optional[str]) -> PayrollEntryOut:
    return PayrollEntryOut(
        id=entry.id, employee_id=employee.id,
        employee_name=f"{employee.first_name} {employee.last_name}".strip(), emp_code=employee.emp_code,
        department=dept_name, is_included=entry.is_included, total_working_days=entry.total_working_days,
        days_worked=float(entry.days_worked), lop_days=float(entry.lop_days or 0),
        has_salary_error=entry.has_salary_error,
        breakup=json.loads(entry.breakup) if entry.breakup else None,
        gross_earnings=entry.gross_earnings, total_deductions=entry.total_deductions, net_pay=entry.net_pay,
    )


def _run_out(db: Session, run: PayrollRun, company_id: str, skipped: int = 0) -> PayrollRunOut:
    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run.id).all()
    emp_ids = [e.employee_id for e in entries]
    employees = {e.id: e for e in db.query(Employee).filter(Employee.id.in_(emp_ids)).all()} if emp_ids else {}
    dept_map = {d.id: d.name for d in db.query(Department).filter(Department.company_id == company_id).all()}
    out_entries = [
        _entry_out(e, employees[e.employee_id], dept_map.get(employees[e.employee_id].department_id))
        for e in entries if e.employee_id in employees
    ]
    return PayrollRunOut(
        id=run.id, month=run.month, year=run.year, status=run.status,
        calculated_at=run.calculated_at, finalized_at=run.finalized_at,
        entries=out_entries, skipped=skipped,
    )


def _get_run(db: Session, run_id: str, user: User) -> PayrollRun:
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id, PayrollRun.company_id == user.company_id).first()
    if not run:
        raise HTTPException(404, "Payroll run not found")
    return run


@router.post("/runs", response_model=PayrollRunOut)
def create_run(body: PayrollRunCreateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    if db.query(PayrollRun).filter(
        PayrollRun.company_id == user.company_id, PayrollRun.month == body.month, PayrollRun.year == body.year
    ).first():
        raise HTTPException(400, f"A payroll run for {MONTH_NAMES[body.month]} {body.year} already exists")

    settings = db.query(PayrollSettings).filter(PayrollSettings.company_id == user.company_id).first()
    total_working_days = working_days_in_month(
        body.year, body.month,
        settings.work_week if settings else None,
        settings.salary_calc_method if settings else "ACTUAL_DAYS",
        settings.fixed_working_days if settings else None,
    )

    run = PayrollRun(company_id=user.company_id, month=body.month, year=body.year)
    db.add(run)
    db.flush()

    employees = db.query(Employee).filter(Employee.company_id == user.company_id, Employee.status == "Active").all()
    for e in employees:
        has_error = not e.salary_breakup
        db.add(PayrollEntry(
            payroll_run_id=run.id, employee_id=e.id, is_included=not has_error,
            total_working_days=total_working_days, days_worked=total_working_days, lop_days=0,
            has_salary_error=has_error,
        ))
    db.commit()
    db.refresh(run)
    return _run_out(db, run, user.company_id)


@router.get("/runs/{run_id}", response_model=PayrollRunOut)
def get_run(run_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    run = _get_run(db, run_id, user)
    return _run_out(db, run, user.company_id)


@router.put("/runs/{run_id}/entries/{entry_id}", response_model=PayrollEntryOut)
def update_entry(
    run_id: str, entry_id: str, body: PayrollEntryUpdateIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _require_hr(user)
    run = _get_run(db, run_id, user)
    if run.status == "FINALIZED":
        raise HTTPException(400, "This payroll run is finalized")
    entry = db.query(PayrollEntry).filter(PayrollEntry.id == entry_id, PayrollEntry.payroll_run_id == run.id).first()
    if not entry:
        raise HTTPException(404, "Payroll entry not found")

    if body.is_included is not None:
        if body.is_included and entry.has_salary_error:
            raise HTTPException(400, "This employee has no salary configured yet — set it up first")
        entry.is_included = body.is_included
    if body.days_worked is not None:
        entry.days_worked = body.days_worked
        entry.lop_days = max(entry.total_working_days - body.days_worked, 0)
    elif body.lop_days is not None:
        entry.lop_days = body.lop_days
        entry.days_worked = max(entry.total_working_days - body.lop_days, 0)
    db.commit()
    db.refresh(entry)

    employee = db.query(Employee).filter(Employee.id == entry.employee_id).first()
    dept_name = None
    if employee and employee.department_id:
        dept = db.query(Department).filter(Department.id == employee.department_id).first()
        dept_name = dept.name if dept else None
    return _entry_out(entry, employee, dept_name)


@router.post("/runs/{run_id}/calculate", response_model=PayrollRunOut)
def calculate_run(run_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    run = _get_run(db, run_id, user)
    if run.status == "FINALIZED":
        raise HTTPException(400, "This payroll run is finalized")

    settings = db.query(PayrollSettings).filter(PayrollSettings.company_id == user.company_id).first()
    pt_slabs = _pt_slabs_for(db, user.company_id)
    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run.id).all()
    skipped = 0

    for entry in entries:
        if not entry.is_included:
            continue
        employee = db.query(Employee).filter(Employee.id == entry.employee_id).first()
        if not employee or not employee.salary_breakup:
            entry.has_salary_error = True
            entry.is_included = False
            skipped += 1
            continue
        stored_breakup = json.loads(employee.salary_breakup)
        result = compute_payroll_entry(
            stored_breakup=stored_breakup, total_working_days=entry.total_working_days,
            days_worked=float(entry.days_worked),
            epf_lop_config=settings.epf_lop_config if settings else "PRORATE",
            epf_employer_rate=float(settings.epf_employer_rate) if settings else 12.0,
            eps_contribute=employee.eps_contribute, eps_actual_wages=employee.eps_actual_wages,
            vpf_percentage=float(employee.vpf_percentage or 0), pt_slabs=pt_slabs,
        )
        entry.breakup = json.dumps(result)
        entry.gross_earnings = result["gross_earnings"]
        entry.total_deductions = result["total_deductions"]
        entry.net_pay = result["net_pay"]

    run.status = "CALCULATED"
    run.calculated_at = datetime.utcnow()
    db.commit()
    db.refresh(run)
    return _run_out(db, run, user.company_id, skipped=skipped)


@router.post("/runs/{run_id}/finalize", response_model=PayrollRunOut)
def finalize_run(run_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    run = _get_run(db, run_id, user)
    if run.status != "CALCULATED":
        raise HTTPException(400, "Calculate the payroll run before finalizing it")
    run.status = "FINALIZED"
    run.finalized_at = datetime.utcnow()
    db.commit()
    db.refresh(run)
    return _run_out(db, run, user.company_id)
