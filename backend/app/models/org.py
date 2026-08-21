from sqlalchemy import String, Integer, ForeignKey, DateTime, func, Boolean, Text
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
    website: Mapped[str | None] = mapped_column(String(200))
    org_type: Mapped[str | None] = mapped_column(String(100))
    contact_person: Mapped[str | None] = mapped_column(String(100))
    contact_number: Mapped[str | None] = mapped_column(String(30))
    contact_email: Mapped[str | None] = mapped_column(String(200))
    address_line1: Mapped[str | None] = mapped_column(String(200))
    address_line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    # This company's row id in the Super Admin app's own DB — set at provisioning
    # time, used to route support tickets and other cross-app calls to the
    # right Super Admin company record.
    super_admin_company_id: Mapped[int | None] = mapped_column(Integer)

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(100))
    code: Mapped[str | None] = mapped_column(String(50))
    mail_alias: Mapped[str | None] = mapped_column(String(100))
    lead_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"))
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"))

class Designation(Base):
    __tablename__ = "designations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    title: Mapped[str] = mapped_column(String(100))
    code: Mapped[str | None] = mapped_column(String(50))
    mail_alias: Mapped[str | None] = mapped_column(String(100))

class WorkLocation(Base):
    __tablename__ = "work_locations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(100))
    code: Mapped[str | None] = mapped_column(String(50))
    mail_alias: Mapped[str | None] = mapped_column(String(100))
    address_line1: Mapped[str | None] = mapped_column(String(200))
    address_line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)

class Shift(Base):
    __tablename__ = "shifts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(100))
    start_time: Mapped[str] = mapped_column(String(10))
    end_time: Mapped[str] = mapped_column(String(10))
    color: Mapped[str | None] = mapped_column(String(20))

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default="company_admin")  # super_admin / company_admin / hr_manager / employee
    employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    # When set on an hr_manager account, that HR manager's access is scoped to
    # employees in this department only. Ignored for other roles (always full access).
    assigned_department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
