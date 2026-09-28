"""Total working days for a payroll month, per the org's Pay Schedule setup."""
import calendar
import datetime

# "MON" -> 0 ... "SUN" -> 6, matching Python's date.weekday()
_WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


def working_days_in_month(
    year: int,
    month: int,
    work_week: str | None,
    salary_calc_method: str = "ACTUAL_DAYS",
    fixed_working_days: int | None = None,
) -> int:
    if salary_calc_method == "FIXED_DAYS" and fixed_working_days:
        return int(fixed_working_days)

    codes = {c.strip().upper() for c in (work_week or "").split(",") if c.strip()}
    if not codes:
        codes = {"MON", "TUE", "WED", "THU", "FRI", "SAT"}  # sane default: 6-day week
    weekdays = {_WEEKDAY_CODES.index(c) for c in codes if c in _WEEKDAY_CODES}

    days_in_month = calendar.monthrange(year, month)[1]
    return sum(
        1 for d in range(1, days_in_month + 1)
        if datetime.date(year, month, d).weekday() in weekdays
    )
