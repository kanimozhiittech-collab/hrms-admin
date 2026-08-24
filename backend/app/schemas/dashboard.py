from pydantic import BaseModel
from typing import List, Optional

class DeptCount(BaseModel):
    department: str
    count: int

class GrowthPoint(BaseModel):
    month: str
    count: int

class AttendancePoint(BaseModel):
    day: str
    present: int
    absent: int
    leave: int

class Activity(BaseModel):
    id: str
    text: str
    when: str

class DashboardStats(BaseModel):
    total_employees: int
    present_today: int
    absent_today: int
    on_leave: int
    departments: int
    by_department: List[DeptCount]
    growth: List[GrowthPoint]
    attendance: List[AttendancePoint]
    recent_activity: List[Activity]

class OverviewProfile(BaseModel):
    employee_code: str
    name: str
    email: str
    photo_url: Optional[str] = None
    status_text: str
    timer: List[str]
    can_check_in: bool
    checked_in_at: Optional[str] = None
    checked_out_at: Optional[str] = None
    check_in_button: str
    attendance_action: str

class OverviewShift(BaseModel):
    name: str
    start_time: str
    end_time: str
    display: str

class OverviewWeekDay(BaseModel):
    day: str
    date: str
    note: Optional[str] = None
    tone: str = ""
    is_today: bool = False

class OverviewActivity(BaseModel):
    greeting: str
    person_name: str
    message: str
    reminder_title: str
    reminder_text: str
    time_log_message: str

class OverviewProfileDetails(BaseModel):
    timezone: str
    about_text: str
    tags: List[str]

class OverviewTimeLogs(BaseModel):
    projects: List[str]
    jobs: List[str]
    selected_billable: str
    timer: str
    empty_state: str

class OverviewModuleState(BaseModel):
    title: str
    empty_state: str
    count: int = 0

class DashboardOverview(BaseModel):
    tabs: List[str]
    profile: OverviewProfile
    shift: OverviewShift
    week_start: str
    week_end: str
    week: List[OverviewWeekDay]
    activity: OverviewActivity
    profile_details: OverviewProfileDetails
    time_logs: OverviewTimeLogs
    modules: dict[str, OverviewModuleState]
