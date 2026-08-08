from sqlalchemy import String, ForeignKey, DateTime, Date, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date
from ..database import Base
import uuid

def _uuid(): return str(uuid.uuid4())


class OrgFile(Base):
    __tablename__ = "org_files"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    folder: Mapped[str | None] = mapped_column(String(100))
    file_url: Mapped[str] = mapped_column(String(500))
    uploaded_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())


class LetterRequest(Base):
    __tablename__ = "letter_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"))
    letter_type: Mapped[str] = mapped_column(String(30))  # Address Proof / Bonafide Letter / Experience Letter
    date_of_request: Mapped[date] = mapped_column(Date)
    reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Pending")  # Pending / Issued / Rejected
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())


class HrTask(Base):
    __tablename__ = "hr_tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"))
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[str] = mapped_column(String(20), default="Moderate")  # Low / Moderate / High
    status: Mapped[str] = mapped_column(String(20), default="Open")  # Open / In Progress / Completed
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())


class ExitDetail(Base):
    __tablename__ = "exit_details"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"))
    separation_date: Mapped[date] = mapped_column(Date)
    interviewer_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"))
    reason: Mapped[str | None] = mapped_column(String(200))
    feedback: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Pending")  # Pending / Completed
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
