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


# Attendance status values
ATT_PRESENT = "Present"
ATT_ABSENT = "Absent"
ATT_HALF_DAY = "Half_Day"
ATT_ON_LEAVE = "On_Leave"
ATT_HOLIDAY = "Holiday"
ATT_WEEKEND = "Weekend"


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    __table_args__ = (UniqueConstraint("user_id", "work_date", name="uq_attendance_user_work_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    work_date: Mapped[date] = mapped_column(Date, index=True)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── enrichment fields ──
    status: Mapped[str] = mapped_column(String(20), default=ATT_PRESENT)
    work_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    overtime_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    late_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    early_exit_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_regularized: Mapped[bool] = mapped_column(Boolean, default=False)
    regularize_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    leave_request_id: Mapped[str | None] = mapped_column(ForeignKey("leave_requests.id"), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="web")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Holiday(Base):
    __tablename__ = "holidays"
    __table_args__ = (UniqueConstraint("company_id", "holiday_date", name="uq_holiday_company_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    holiday_date: Mapped[date] = mapped_column(Date, index=True)
    holiday_type: Mapped[str] = mapped_column(String(20), default="national")  # national | optional | restricted
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class RegularizationRequest(Base):
    __tablename__ = "regularization_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    work_date: Mapped[date] = mapped_column(Date)
    requested_check_in: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    requested_check_out: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved | rejected
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
