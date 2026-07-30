from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


# ── Attendance logs ──
class AttendanceLogOut(BaseModel):
    id: str
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    work_date: date
    check_in_at: Optional[datetime] = None
    check_out_at: Optional[datetime] = None
    status: str
    work_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    late_minutes: Optional[int] = None
    early_exit_minutes: Optional[int] = None
    is_regularized: bool = False
    source: str = "web"

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    month: int
    year: int
    present: int
    absent: int
    half_day: int
    on_leave: int
    holidays: int
    weekends: int
    late_count: int
    total_work_hours: float
    total_overtime: float
    logs: List[AttendanceLogOut]


# ── Holidays ──
class HolidayIn(BaseModel):
    name: str
    holiday_date: date
    holiday_type: str = "national"


class HolidayOut(BaseModel):
    id: str
    name: str
    holiday_date: date
    holiday_type: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Regularization ──
class RegularizationIn(BaseModel):
    work_date: date
    requested_check_in: Optional[datetime] = None
    requested_check_out: Optional[datetime] = None
    reason: str


class RegularizationReview(BaseModel):
    comment: Optional[str] = None


class RegularizationOut(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    work_date: date
    requested_check_in: Optional[datetime] = None
    requested_check_out: Optional[datetime] = None
    reason: str
    status: str
    review_comment: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
