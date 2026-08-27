from datetime import date, datetime
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


def _uuid():
    return str(uuid.uuid4())


# Leave request status values
LR_PENDING = "pending"
LR_APPROVED = "approved"
LR_REJECTED = "rejected"
LR_CANCELLED = "cancelled"


class LeaveType(Base):
    __tablename__ = "leave_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    name: Mapped[str] = mapped_column(String(50))
    code: Mapped[str] = mapped_column(String(10))
    days_per_year: Mapped[float] = mapped_column(Float, default=0)
    accrual_type: Mapped[str] = mapped_column(String(20), default="upfront")  # upfront | monthly | quarterly
    carry_forward: Mapped[bool] = mapped_column(Boolean, default=False)
    max_carry_days: Mapped[float | None] = mapped_column(Float, nullable=True)
    encashable: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_half_day: Mapped[bool] = mapped_column(Boolean, default=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True)
    min_notice_days: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(7), default="#2563EB")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_balance_emp_type_year"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), index=True)
    leave_type_id: Mapped[str] = mapped_column(ForeignKey("leave_types.id"), index=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    allocated: Mapped[float] = mapped_column(Float, default=0)
    used: Mapped[float] = mapped_column(Float, default=0)
    pending: Mapped[float] = mapped_column(Float, default=0)
    carried_forward: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def available(self) -> float:
        return round(self.allocated + self.carried_forward - self.used - self.pending, 2)


class LeaveApprovalConfig(Base):
    """Per-department, per-module approval routing (Leave and Regularization
    share this table). Level 1 is the normal approver; if they're on approved
    leave today, review responsibility automatically shifts to Level 2
    instead (only when approval_type is two_level)."""
    __tablename__ = "leave_approval_configs"
    __table_args__ = (
        UniqueConstraint("company_id", "module", "department_id", name="uq_approval_config_company_module_dept"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    module: Mapped[str] = mapped_column(String(30), default="Leave")
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), index=True)
    approval_type: Mapped[str] = mapped_column(String(20), default="single_level")  # single_level | two_level
    level1_employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"))
    level2_employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="active")  # active | inactive
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    leave_type_id: Mapped[str] = mapped_column(ForeignKey("leave_types.id"), index=True)
    from_date: Mapped[date] = mapped_column(Date)
    to_date: Mapped[date] = mapped_column(Date)
    half_day: Mapped[bool] = mapped_column(Boolean, default=False)
    half_day_session: Mapped[str | None] = mapped_column(String(12), nullable=True)  # first_half | second_half
    days_count: Mapped[float] = mapped_column(Float, default=0)
    reason: Mapped[str] = mapped_column(String(500))
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default=LR_PENDING)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
