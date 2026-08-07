from pydantic import BaseModel, EmailStr

class ProvisionCompanyIn(BaseModel):
    company_name: str
    admin_name: str
    admin_email: EmailStr
    temp_password: str
