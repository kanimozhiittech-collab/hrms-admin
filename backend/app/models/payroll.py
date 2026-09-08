from sqlalchemy import String, Integer, ForeignKey, Date, Numeric, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date
from ..database import Base
import uuid

def _uuid(): return str(uuid.uuid4())


class PayrollSettings(Base):
    """Org-level Payroll Master Setup — one row per company (Pay Schedule +
    Statutory EPF/ESI/PT/LWF configuration everything else calculates from)."""
    __tablename__ = "payroll_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), unique=True, index=True)

    # ---- Pay Schedule ----
    work_week: Mapped[str | None] = mapped_column(String(50))  # comma-separated: "MON,TUE,WED,THU,FRI,SAT"
    salary_calc_method: Mapped[str] = mapped_column(String(20), default="ACTUAL_DAYS")  # ACTUAL_DAYS | FIXED_DAYS
    fixed_working_days: Mapped[int | None] = mapped_column(Integer)
    pay_date_type: Mapped[str] = mapped_column(String(20), default="LAST_DAY")  # LAST_DAY | CUSTOM
    custom_pay_day: Mapped[int | None] = mapped_column(Integer)  # 1-28
    first_payroll_month: Mapped[date | None] = mapped_column(Date)

    # ---- EPF ----
    epf_number: Mapped[str | None] = mapped_column(String(30))
    epf_employer_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=12.0)
    epf_lop_config: Mapped[str] = mapped_column(String(20), default="PRORATE")  # PRORATE | FULL_BASIC
    eps_contribute: Mapped[bool] = mapped_column(Boolean, default=True)
    eps_actual_wages: Mapped[bool] = mapped_column(Boolean, default=False)

    # ---- ESI ----
    esi_number: Mapped[str | None] = mapped_column(String(30))
    esi_deduction_cycle: Mapped[str] = mapped_column(String(20), default="MONTHLY")  # MONTHLY | SEMI_ANNUALLY

    # ---- Professional Tax ----
    pt_number: Mapped[str | None] = mapped_column(String(30))
    pt_state: Mapped[str | None] = mapped_column(String(100))
    pt_deduction_cycle: Mapped[str] = mapped_column(String(20), default="MONTHLY")

    # ---- Labour Welfare Fund ----
    lwf_employee_amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    lwf_employer_amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    lwf_deduction_cycle: Mapped[str | None] = mapped_column(String(20))  # MONTHLY | SEMI_ANNUALLY


class SalaryComponent(Base):
    """Org-defined Earning/Deduction/Benefit/Reimbursement component (Master
    Setup > Salary Components). Employee salary breakups are computed by
    walking the active EARNING components for the company."""
    __tablename__ = "payroll_salary_components"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(20))  # EARNING | DEDUCTION | BENEFIT | REIMBURSEMENT
    calc_type: Mapped[str] = mapped_column(String(20))  # PERCENT_CTC | PERCENT_BASIC | PERCENT_GROSS | FIXED | BALANCING | AUTO_STATUTORY
    value: Mapped[float | None] = mapped_column(Numeric(10, 2))  # percentage or fixed monthly amount
    is_taxable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_statutory: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    show_in_payslip: Mapped[bool] = mapped_column(Boolean, default=True)
    max_limit: Mapped[float | None] = mapped_column(Numeric(10, 2))  # reimbursements
    requires_bill: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class PTSlab(Base):
    """Professional Tax slab row — company-editable, seedable with per-state
    defaults via /api/payroll/master/pt-slabs/load-defaults."""
    __tablename__ = "payroll_pt_slabs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    salary_from: Mapped[float] = mapped_column(Numeric(10, 2))
    salary_to: Mapped[float | None] = mapped_column(Numeric(10, 2))  # null = "and above"
    pt_amount: Mapped[float] = mapped_column(Numeric(10, 2))
