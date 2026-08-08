from pydantic import BaseModel
from typing import Optional

class CompanyUpdateIn(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    org_type: Optional[str] = None
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    contact_email: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

class CompanyOut(BaseModel):
    id: str
    name: str
    website: Optional[str] = None
    org_type: Optional[str] = None
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    contact_email: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    logo_url: Optional[str] = None
    class Config: from_attributes = True
