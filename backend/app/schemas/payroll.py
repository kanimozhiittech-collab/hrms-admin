from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from .employee import _blank_to_none
from pydantic import model_validator


class PayrollSettingsIn(BaseModel):
    work_week: Optional[str] = None
    salary_calc_method: str = "ACTUAL_DAYS"
    fixed_working_days: Optional[int] = None
    pay_date_type: str = "LAST_DAY"
    custom_pay_day: Optional[int] = None
    first_payroll_month: Optional[date] = None

    epf_number: Optional[str] = None
    epf_employer_rate: float = 12.0
    epf_lop_config: str = "PRORATE"
    eps_contribute: bool = True
    eps_actual_wages: bool = False

    esi_number: Optional[str] = None
    esi_deduction_cycle: str = "MONTHLY"

    pt_number: Optional[str] = None
    pt_state: Optional[str] = None
    pt_deduction_cycle: str = "MONTHLY"

    lwf_employee_amount: Optional[float] = None
    lwf_employer_amount: Optional[float] = None
    lwf_deduction_cycle: Optional[str] = None

    _blank = model_validator(mode="before")(_blank_to_none)


class PayrollSettingsOut(PayrollSettingsIn):
    id: str
    class Config: from_attributes = True


class SalaryComponentIn(BaseModel):
    name: str
    category: str  # EARNING | DEDUCTION | BENEFIT | REIMBURSEMENT
    calc_type: str  # PERCENT_CTC | PERCENT_BASIC | PERCENT_GROSS | FIXED | BALANCING | AUTO_STATUTORY
    value: Optional[float] = None
    is_taxable: bool = True
    is_statutory: bool = False
    is_active: bool = True
    show_in_payslip: bool = True
    max_limit: Optional[float] = None
    requires_bill: bool = False
    sort_order: int = 0

    _blank = model_validator(mode="before")(_blank_to_none)


class SalaryComponentOut(SalaryComponentIn):
    id: str
    class Config: from_attributes = True


class PTSlabIn(BaseModel):
    salary_from: float
    salary_to: Optional[float] = None
    pt_amount: float

    _blank = model_validator(mode="before")(_blank_to_none)


class PTSlabOut(PTSlabIn):
    id: str
    class Config: from_attributes = True


class EmployeeSalaryIn(BaseModel):
    ctc: Optional[float] = None
    eps_contribute: bool = True
    eps_actual_wages: bool = False
    vpf_percentage: float = 0
    pt_state_override: Optional[str] = None

    _blank = model_validator(mode="before")(_blank_to_none)


class EmployeeSalaryOut(BaseModel):
    employee_id: str
    ctc: Optional[float] = None
    eps_contribute: bool
    eps_actual_wages: bool
    vpf_percentage: float
    pt_state_override: Optional[str] = None
    monthly_gross: Optional[float] = None
    is_esi_applicable: bool
    breakup: Optional[Dict[str, Any]] = None
    pf_number: Optional[str] = None
    uan_number: Optional[str] = None
    esi_number: Optional[str] = None


class PayrollRunSummaryOut(BaseModel):
    id: str
    month: int
    year: int
    status: str
    employee_count: int
    total_net_pay: float
    class Config: from_attributes = True


class PayrollDashboardOut(BaseModel):
    settings_configured: bool
    total_employees: int
    employees_with_salary: int
    esi_applicable_count: int
    runs: List[PayrollRunSummaryOut]


class PayrollRunCreateIn(BaseModel):
    month: int
    year: int


class PayrollEntryOut(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    emp_code: str
    department: Optional[str] = None
    is_included: bool
    total_working_days: int
    days_worked: float
    lop_days: float
    has_salary_error: bool
    breakup: Optional[Dict[str, Any]] = None
    gross_earnings: Optional[float] = None
    total_deductions: Optional[float] = None
    net_pay: Optional[float] = None


class PayrollEntryUpdateIn(BaseModel):
    is_included: Optional[bool] = None
    days_worked: Optional[float] = None
    lop_days: Optional[float] = None

    _blank = model_validator(mode="before")(_blank_to_none)


class PayrollRunOut(BaseModel):
    id: str
    month: int
    year: int
    status: str
    calculated_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None
    entries: List[PayrollEntryOut]
    skipped: int = 0
