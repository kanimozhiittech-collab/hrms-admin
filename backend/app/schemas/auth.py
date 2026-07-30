from pydantic import BaseModel, EmailStr

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
