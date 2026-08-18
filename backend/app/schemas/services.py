from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


# ── Files ──
class OrgFileOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    folder: Optional[str] = None
    file_url: str
    created_at: datetime
    class Config: from_attributes = True


# ── HR Letters ──
class LetterRequestIn(BaseModel):
    employee_id: str
    letter_type: str
    date_of_request: date
    reason: Optional[str] = None

class LetterStatusIn(BaseModel):
    status: str

class LetterRequestOut(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    letter_type: str
    date_of_request: date
    reason: Optional[str] = None
    status: str
    created_at: datetime
    class Config: from_attributes = True


# ── Tasks ──
class TaskIn(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    priority: str = "Moderate"

class TaskStatusIn(BaseModel):
    status: str

class TaskOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    priority: str
    status: str
    created_at: datetime
    class Config: from_attributes = True


# ── Meetings ──
class MeetingIn(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: date
    start_time: str
    end_time: str
    participant_ids: List[str] = []

class MeetingOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    meeting_date: date
    start_time: str
    end_time: str
    organizer_id: str
    organizer_name: Optional[str] = None
    participant_ids: List[str] = []
    participant_names: List[str] = []
    created_at: datetime


# ── General / Exit Details ──
class ExitDetailIn(BaseModel):
    employee_id: str
    separation_date: date
    interviewer_id: Optional[str] = None
    reason: Optional[str] = None
    feedback: Optional[str] = None

class ExitStatusIn(BaseModel):
    status: str

class ExitDetailOut(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    separation_date: date
    interviewer_id: Optional[str] = None
    interviewer_name: Optional[str] = None
    reason: Optional[str] = None
    feedback: Optional[str] = None
    status: str
    created_at: datetime
    class Config: from_attributes = True
