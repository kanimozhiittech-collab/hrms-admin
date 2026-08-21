from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, Numeric, Boolean, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from ..database import Base
import uuid

def _uuid(): return str(uuid.uuid4())

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)

    # ---- Personal ----
    emp_code: Mapped[str] = mapped_column(String(50), index=True)        # EMP-001
    prefix: Mapped[str | None] = mapped_column(String(10))               # Mr/Ms/Mrs/Dr
    first_name: Mapped[str] = mapped_column(String(80))
    middle_name: Mapped[str | None] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    display_name: Mapped[str | None] = mapped_column(String(160))
    gender: Mapped[str | None] = mapped_column(String(20))               # Male/Female/Other
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    blood_group: Mapped[str | None] = mapped_column(String(5))
    marital_status: Mapped[str | None] = mapped_column(String(20))       # Single/Married/Divorced/Widowed
    nationality: Mapped[str | None] = mapped_column(String(50))
    photo_url: Mapped[str | None] = mapped_column(String(500))

    # ---- Contact ----
    work_email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    personal_email: Mapped[str | None] = mapped_column(String(200))
    mobile: Mapped[str | None] = mapped_column(String(20))
    alt_phone: Mapped[str | None] = mapped_column(String(20))

    # ---- Job ----
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"))
    designation_id: Mapped[str | None] = mapped_column(ForeignKey("designations.id"))
    employee_type: Mapped[str] = mapped_column(String(30), default="Permanent")  # Permanent/Contract/Intern/Trainee/Consultant
    date_of_joining: Mapped[date | None] = mapped_column(Date)
    probation_end_date: Mapped[date | None] = mapped_column(Date)
    confirmation_date: Mapped[date | None] = mapped_column(Date)
    reporting_manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"))
    work_location_id: Mapped[str | None] = mapped_column(ForeignKey("work_locations.id"))
    shift_id: Mapped[str | None] = mapped_column(ForeignKey("shifts.id"))
    source_of_hire: Mapped[str | None] = mapped_column(String(50))       # Referral/LinkedIn/Naukri/Direct
    tags: Mapped[str | None] = mapped_column(String(500))                # comma-separated
    status: Mapped[str] = mapped_column(String(20), default="Active")    # Active/On Leave/Inactive/Resigned/Terminated
    exit_date: Mapped[date | None] = mapped_column(Date)

    # ---- Compensation ----
    ctc: Mapped[float | None] = mapped_column(Numeric(14, 2))
    pay_frequency: Mapped[str | None] = mapped_column(String(20), default="Monthly")  # Monthly/Weekly/Hourly

    # ---- Bank ----
    bank_name: Mapped[str | None] = mapped_column(String(120))
    bank_account_no: Mapped[str | None] = mapped_column(String(40))
    bank_ifsc: Mapped[str | None] = mapped_column(String(20))
    bank_branch: Mapped[str | None] = mapped_column(String(120))
    bank_account_type: Mapped[str | None] = mapped_column(String(20))    # Savings/Current

    # ---- Statutory (India) ----
    pan_number: Mapped[str | None] = mapped_column(String(20))
    aadhaar_number: Mapped[str | None] = mapped_column(String(20))
    uan_number: Mapped[str | None] = mapped_column(String(20))
    pf_number: Mapped[str | None] = mapped_column(String(30))
    esi_number: Mapped[str | None] = mapped_column(String(30))
    passport_number: Mapped[str | None] = mapped_column(String(30))
    passport_expiry: Mapped[date | None] = mapped_column(Date)

    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    addresses: Mapped[list["EmployeeAddress"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    education: Mapped[list["EducationRecord"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    experience: Mapped[list["ExperienceRecord"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    dependents: Mapped[list["Dependent"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    emergency_contacts: Mapped[list["EmergencyContact"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    documents: Mapped[list["EmployeeDocument"]] = relationship(back_populates="employee", cascade="all, delete-orphan")


class EmployeeAddress(Base):
    __tablename__ = "employee_addresses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    address_type: Mapped[str] = mapped_column(String(20))                # Present/Permanent
    line1: Mapped[str | None] = mapped_column(String(200))
    line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(200))
    state: Mapped[str | None] = mapped_column(String(200))
    country: Mapped[str | None] = mapped_column(String(200))
    pincode: Mapped[str | None] = mapped_column(String(15))
    employee: Mapped["Employee"] = relationship(back_populates="addresses")


class EducationRecord(Base):
    __tablename__ = "employee_education"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    institute: Mapped[str | None] = mapped_column(String(200))
    degree: Mapped[str | None] = mapped_column(String(120))
    specialization: Mapped[str | None] = mapped_column(String(120))
    year_from: Mapped[int | None] = mapped_column(Integer)
    year_to: Mapped[int | None] = mapped_column(Integer)
    grade: Mapped[str | None] = mapped_column(String(20))
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_url: Mapped[str | None] = mapped_column(String(500))
    employee: Mapped["Employee"] = relationship(back_populates="education")


class ExperienceRecord(Base):
    __tablename__ = "employee_experience"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    company_name: Mapped[str | None] = mapped_column(String(200))
    designation: Mapped[str | None] = mapped_column(String(120))
    from_date: Mapped[date | None] = mapped_column(Date)
    to_date: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text)
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_url: Mapped[str | None] = mapped_column(String(500))
    employee: Mapped["Employee"] = relationship(back_populates="experience")


class Dependent(Base):
    __tablename__ = "employee_dependents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    relationship_type: Mapped[str | None] = mapped_column(String(40))    # Spouse/Child/Parent
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    is_dependent: Mapped[bool] = mapped_column(Boolean, default=True)
    employee: Mapped["Employee"] = relationship(back_populates="dependents")


class EmergencyContact(Base):
    __tablename__ = "employee_emergency_contacts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    relationship_type: Mapped[str | None] = mapped_column(String(40))
    mobile: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String(300))
    employee: Mapped["Employee"] = relationship(back_populates="emergency_contacts")


class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    doc_type: Mapped[str] = mapped_column(String(40))                    # Aadhaar/PAN/Passport/Resume/OfferLetter/Certificate/Other
    file_name: Mapped[str] = mapped_column(String(200))
    file_url: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    employee: Mapped["Employee"] = relationship(back_populates="documents")
