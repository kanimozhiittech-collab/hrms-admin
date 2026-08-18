from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreateIn(BaseModel):
    email: EmailStr
    role: str
    assigned_department_id: Optional[str] = None

class UserRoleUpdateIn(BaseModel):
    role: str

class UserProfileUpdateIn(BaseModel):
    email: EmailStr
    employee_id: Optional[str] = None
    assigned_department_id: Optional[str] = None

class UserOut(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    assigned_department_id: Optional[str] = None
    assigned_department_name: Optional[str] = None
    class Config: from_attributes = True

class UserCreateOut(UserOut):
    temp_password: str
