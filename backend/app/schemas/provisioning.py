from typing import Optional

from pydantic import BaseModel, EmailStr

class ProvisionCompanyIn(BaseModel):
    company_id: Optional[int] = None
    company_name: str
    admin_name: str
    admin_email: EmailStr
    phone: Optional[str] = None
    temp_password: str

class ResetAdminPasswordIn(BaseModel):
    new_password: str
