from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional, List

class AddressIn(BaseModel):
    address_type: str = Field(pattern="^(Present|Permanent)$")
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None

class EducationIn(BaseModel):
    institute: Optional[str] = None
    degree: Optional[str] = None
    specialization: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    grade: Optional[str] = None

class ExperienceIn(BaseModel):
    company_name: Optional[str] = None
    designation: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    description: Optional[str] = None

class DependentIn(BaseModel):
    name: str
    relationship_type: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    is_dependent: bool = True

class EmergencyIn(BaseModel):
    name: str
    relationship_type: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None

class DocumentOut(BaseModel):
    id: str
    doc_type: str
    file_name: str
    file_url: str
    class Config: from_attributes = True

class EmployeeIn(BaseModel):
    # Personal
    emp_code: str
    prefix: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    display_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    photo_url: Optional[str] = None
    # Contact
    work_email: EmailStr
    personal_email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    alt_phone: Optional[str] = None
    # Job
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    employee_type: str = "Permanent"
    date_of_joining: Optional[date] = None
    probation_end_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    reporting_manager_id: Optional[str] = None
    work_location_id: Optional[str] = None
    shift_id: Optional[str] = None
    source_of_hire: Optional[str] = None
    tags: Optional[str] = None
    status: str = "Active"
    exit_date: Optional[date] = None
    # Comp
    ctc: Optional[float] = None
    pay_frequency: Optional[str] = "Monthly"
    # Bank
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_type: Optional[str] = None
    # Statutory
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    uan_number: Optional[str] = None
    pf_number: Optional[str] = None
    esi_number: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    notes: Optional[str] = None
    # nested
    addresses: List[AddressIn] = []
    education: List[EducationIn] = []
    experience: List[ExperienceIn] = []
    dependents: List[DependentIn] = []
    emergency_contacts: List[EmergencyIn] = []

class EmployeeListItem(BaseModel):
    id: str
    emp_code: str
    first_name: str
    last_name: str
    work_email: EmailStr
    mobile: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_type: str
    status: str
    photo_url: Optional[str] = None
    date_of_joining: Optional[date] = None
    reporting_manager_id: Optional[str] = None

class EmployeeListResponse(BaseModel):
    items: List[EmployeeListItem]
    total: int
    page: int
    page_size: int

class EmployeeOut(EmployeeIn):
    id: str
    documents: List[DocumentOut] = []
    class Config: from_attributes = True

class DepartmentIn(BaseModel):
    name: str
    code: Optional[str] = None
    mail_alias: Optional[str] = None
    lead_id: Optional[str] = None
    parent_id: Optional[str] = None

class DepartmentOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    mail_alias: Optional[str] = None
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    parent_id: Optional[str] = None
    parent_name: Optional[str] = None
    class Config: from_attributes = True

class ReassignDepartmentIn(BaseModel):
    to_department_id: Optional[str] = None

class ReassignDesignationIn(BaseModel):
    to_designation_id: Optional[str] = None

class DesignationIn(BaseModel):
    title: str
    code: Optional[str] = None
    mail_alias: Optional[str] = None

class DesignationOut(BaseModel):
    id: str
    title: str
    code: Optional[str] = None
    mail_alias: Optional[str] = None
    class Config: from_attributes = True

class LocationIn(BaseModel):
    name: str
    code: Optional[str] = None
    mail_alias: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    description: Optional[str] = None

class LocationOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    mail_alias: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    description: Optional[str] = None
    class Config: from_attributes = True

class ShiftIn(BaseModel):
    name: str
    start_time: str
    end_time: str
    color: Optional[str] = None

class ShiftOut(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    color: Optional[str] = None
    class Config: from_attributes = True
