from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List


# ── Leave types ──
class LeaveTypeIn(BaseModel):
    name: str
    code: str
    days_per_year: float = 0
    accrual_type: str = "upfront"
    carry_forward: bool = False
    max_carry_days: Optional[float] = None
    encashable: bool = False
    requires_approval: bool = True
    allow_half_day: bool = True
    is_paid: bool = True
    min_notice_days: int = 0
    color: str = "#2563EB"


class LeaveTypeOut(BaseModel):
    id: str
    name: str
    code: str
    days_per_year: float
    accrual_type: str
    carry_forward: bool
    max_carry_days: Optional[float] = None
    encashable: bool
    requires_approval: bool
    allow_half_day: bool
    is_paid: bool
    min_notice_days: int
    color: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Leave balances ──
class LeaveBalanceOut(BaseModel):
    id: str
    leave_type_id: str
    leave_type_name: str
    leave_type_code: str
    color: str
    year: int
    allocated: float
    used: float
    pending: float
    carried_forward: float
    available: float


class LeaveBalanceAdjustIn(BaseModel):
    allocated: float
    year: Optional[int] = None


# ── Leave requests ──
class LeaveRequestIn(BaseModel):
    leave_type_id: str
    from_date: date
    to_date: date
    half_day: bool = False
    half_day_session: Optional[str] = None
    reason: str = Field(min_length=1, max_length=500)


class LeaveReview(BaseModel):
    comment: Optional[str] = None


class LeaveRequestOut(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    leave_type_id: str
    leave_type_name: Optional[str] = None
    leave_type_code: Optional[str] = None
    color: Optional[str] = None
    from_date: date
    to_date: date
    half_day: bool
    half_day_session: Optional[str] = None
    days_count: float
    reason: str
    status: str
    review_comment: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaveCalendarItem(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    leave_type_name: str
    color: str
    from_date: date
    to_date: date
    half_day: bool
    days_count: float
    status: str
