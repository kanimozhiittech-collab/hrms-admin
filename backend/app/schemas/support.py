from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SupportTicketIn(BaseModel):
    subject: str
    description: Optional[str] = None
    priority: str = "medium"


class SupportTicketOut(BaseModel):
    id: int
    subject: str
    description: Optional[str] = None
    priority: str
    status: str
    raised_by_name: Optional[str] = None
    raised_by_email: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
