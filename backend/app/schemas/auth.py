from pydantic import BaseModel, EmailStr, Field

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class Me(BaseModel):
    id: str
    email: EmailStr
    role: str
    company_id: str
    employee_id: str | None = None

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)
