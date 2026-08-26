"""Shared helpers for attendance & leave time calculations."""
from datetime import date, datetime, timedelta
from typing import Iterable
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    """Current time as a naive datetime holding IST wall-clock values.

    In production this runs on servers whose system clock is UTC, so a plain
    datetime.now() silently returns UTC — check-in/check-out times, shift
    start/end ("09:30" etc, meant as IST), and every metric derived from
    comparing them all only line up if "now" is IST too. Naive-but-IST (not
    tz-aware) matches how check_in_at/check_out_at are already stored and
    how the frontend renders them (new Date() on a Z-less ISO string is
    treated as browser-local time, i.e. IST for users in India).
    """
    return datetime.now(IST).replace(tzinfo=None)


def today_ist() -> date:
    """Today's date in IST — matters near midnight, where the UTC calendar
    day can already differ from the IST one by up to 5.5 hours."""
    return now_ist().date()


def parse_hhmm(value: str | None, default: str) -> tuple[int, int]:
    """Parse an 'HH:MM' string into (hour, minute)."""
    raw = (value or default).strip()
    try:
        h, m = raw.split(":")
        return int(h), int(m)
    except (ValueError, AttributeError):
        h, m = default.split(":")
        return int(h), int(m)


def iter_dates(from_date: date, to_date: date) -> Iterable[date]:
    current = from_date
    while current <= to_date:
        yield current
        current += timedelta(days=1)


def is_weekend(d: date) -> bool:
    return d.weekday() in (5, 6)  # Sat, Sun


def working_days(
    from_date: date,
    to_date: date,
    holidays: set[date],
    half_day: bool = False,
) -> float:
    """Count working days in range, excluding weekends and holidays."""
    if half_day:
        return 0.5
    count = 0
    for d in iter_dates(from_date, to_date):
        if is_weekend(d) or d in holidays:
            continue
        count += 1
    return float(count)


def compute_log_metrics(
    check_in: datetime | None,
    check_out: datetime | None,
    shift_start: str,
    shift_end: str,
    work_date: date,
) -> dict:
    """Compute work_hours, overtime, late_minutes, early_exit, status hints."""
    result = {
        "work_hours": None,
        "overtime_hours": None,
        "late_minutes": None,
        "early_exit_minutes": None,
    }

    sh, sm = parse_hhmm(shift_start, "09:00")
    eh, em = parse_hhmm(shift_end, "18:00")
    shift_start_dt = datetime(work_date.year, work_date.month, work_date.day, sh, sm)
    shift_end_dt = datetime(work_date.year, work_date.month, work_date.day, eh, em)
    shift_hours = max((shift_end_dt - shift_start_dt).total_seconds() / 3600.0, 0.0)

    if check_in:
        late = int((check_in - shift_start_dt).total_seconds() // 60)
        result["late_minutes"] = max(late, 0)

    if check_in and check_out:
        worked = max((check_out - check_in).total_seconds() / 3600.0, 0.0)
        result["work_hours"] = round(worked, 2)
        result["overtime_hours"] = round(max(worked - shift_hours, 0.0), 2)
        early = int((shift_end_dt - check_out).total_seconds() // 60)
        result["early_exit_minutes"] = max(early, 0)

    return result
