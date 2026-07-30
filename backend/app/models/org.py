from sqlalchemy import String, Integer, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base
import uuid

def _uuid(): return str(uuid.uuid4())

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200))
    subdomain: Mapped[str] = mapped_column(String(50), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(100))

class Designation(Base):
    __tablename__ = "designations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    title: Mapped[str] = mapped_column(String(100))

class WorkLocation(Base):
    __tablename__ = "work_locations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(100))

class Shift(Base):
    __tablename__ = "shifts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(100))
    start_time: Mapped[str] = mapped_column(String(10))
    end_time: Mapped[str] = mapped_column(String(10))

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default="company_admin")  # super_admin / company_admin / hr_manager / employee
    employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
