from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from datetime import date
import calendar as calendar_mod

from ..database import get_db
from ..models import Employee, OrgFile, LetterRequest, HrTask, ExitDetail, Meeting, User
from ..schemas import (
    OrgFileOut,
    LetterRequestIn, LetterStatusIn, LetterRequestOut,
    TaskIn, TaskStatusIn, TaskOut,
    ExitDetailIn, ExitStatusIn, ExitDetailOut,
    MeetingIn, MeetingOut,
)
from ..core.storage import save_upload
from .deps import current_user

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}


def _require_hr(user: User):
    if user.role not in HR_ROLES:
        raise HTTPException(403, "Not authorized")


def _emp_name_map(db: Session, company_id: str, ids: List[Optional[str]]) -> dict:
    ids = [i for i in set(ids) if i]
    if not ids:
        return {}
    rows = db.query(Employee).filter(Employee.id.in_(ids), Employee.company_id == company_id).all()
    return {e.id: f"{e.first_name} {e.last_name}".strip() for e in rows}


# ──────────────────────────────────────────────
# Files
# ──────────────────────────────────────────────
files_router = APIRouter(prefix="/api/files", tags=["files"])


@files_router.get("", response_model=List[OrgFileOut])
def list_files(db: Session = Depends(get_db), user: User = Depends(current_user)):
    # Any authenticated employee can view/download organization files —
    # only uploading and deleting are HR-restricted.
    return (
        db.query(OrgFile)
        .filter(OrgFile.company_id == user.company_id)
        .order_by(OrgFile.created_at.desc())
        .all()
    )


@files_router.post("", response_model=OrgFileOut)
def upload_file(
    name: str = Form(...),
    description: str = Form(""),
    folder: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _require_hr(user)
    _, file_url = save_upload(file, "org-files")
    org_file = OrgFile(
        company_id=user.company_id, name=name, description=description or None,
        folder=folder or None, file_url=file_url, uploaded_by=user.id,
    )
    db.add(org_file)
    db.commit()
    db.refresh(org_file)
    return org_file


@files_router.delete("/{file_id}", status_code=204)
def delete_file(file_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    org_file = db.query(OrgFile).filter(OrgFile.id == file_id, OrgFile.company_id == user.company_id).first()
    if not org_file:
        return None
    db.delete(org_file)
    db.commit()
    return None


# ──────────────────────────────────────────────
# HR Letters
# ──────────────────────────────────────────────
letters_router = APIRouter(prefix="/api/letters", tags=["hr-letters"])


@letters_router.get("", response_model=List[LetterRequestOut])
def list_letters(db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    rows = (
        db.query(LetterRequest)
        .filter(LetterRequest.company_id == user.company_id)
        .order_by(LetterRequest.created_at.desc())
        .all()
    )
    names = _emp_name_map(db, user.company_id, [r.employee_id for r in rows])
    return [
        LetterRequestOut(
            id=r.id, employee_id=r.employee_id, employee_name=names.get(r.employee_id),
            letter_type=r.letter_type, date_of_request=r.date_of_request,
            reason=r.reason, status=r.status, created_at=r.created_at,
        )
        for r in rows
    ]


@letters_router.post("", response_model=LetterRequestOut)
def create_letter(body: LetterRequestIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    emp = db.query(Employee).filter(Employee.id == body.employee_id, Employee.company_id == user.company_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    r = LetterRequest(company_id=user.company_id, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return LetterRequestOut(
        id=r.id, employee_id=r.employee_id, employee_name=f"{emp.first_name} {emp.last_name}".strip(),
        letter_type=r.letter_type, date_of_request=r.date_of_request,
        reason=r.reason, status=r.status, created_at=r.created_at,
    )


@letters_router.put("/{letter_id}/status", response_model=LetterRequestOut)
def update_letter_status(
    letter_id: str, body: LetterStatusIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _require_hr(user)
    r = db.query(LetterRequest).filter(LetterRequest.id == letter_id, LetterRequest.company_id == user.company_id).first()
    if not r:
        raise HTTPException(404, "Letter request not found")
    r.status = body.status
    db.commit()
    db.refresh(r)
    names = _emp_name_map(db, user.company_id, [r.employee_id])
    return LetterRequestOut(
        id=r.id, employee_id=r.employee_id, employee_name=names.get(r.employee_id),
        letter_type=r.letter_type, date_of_request=r.date_of_request,
        reason=r.reason, status=r.status, created_at=r.created_at,
    )


# ──────────────────────────────────────────────
# Tasks
# ──────────────────────────────────────────────
tasks_router = APIRouter(prefix="/api/hr-tasks", tags=["hr-tasks"])


def _task_out(t: HrTask, names: dict) -> TaskOut:
    return TaskOut(
        id=t.id, name=t.name, description=t.description, owner_id=t.owner_id,
        owner_name=names.get(t.owner_id), start_date=t.start_date, due_date=t.due_date,
        priority=t.priority, status=t.status, created_at=t.created_at,
    )


@tasks_router.get("", response_model=List[TaskOut])
def list_tasks(db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    rows = (
        db.query(HrTask)
        .filter(HrTask.company_id == user.company_id)
        .order_by(HrTask.created_at.desc())
        .all()
    )
    names = _emp_name_map(db, user.company_id, [r.owner_id for r in rows])
    return [_task_out(r, names) for r in rows]


@tasks_router.post("", response_model=TaskOut)
def create_task(body: TaskIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    if body.owner_id:
        emp = db.query(Employee).filter(Employee.id == body.owner_id, Employee.company_id == user.company_id).first()
        if not emp:
            raise HTTPException(404, "Employee not found")
    t = HrTask(company_id=user.company_id, **body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    names = _emp_name_map(db, user.company_id, [t.owner_id])
    return _task_out(t, names)


@tasks_router.put("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: str, body: TaskStatusIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _require_hr(user)
    t = db.query(HrTask).filter(HrTask.id == task_id, HrTask.company_id == user.company_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    t.status = body.status
    db.commit()
    db.refresh(t)
    names = _emp_name_map(db, user.company_id, [t.owner_id])
    return _task_out(t, names)


@tasks_router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    t = db.query(HrTask).filter(HrTask.id == task_id, HrTask.company_id == user.company_id).first()
    if not t:
        return None
    db.delete(t)
    db.commit()
    return None


# ──────────────────────────────────────────────
# General / Exit Details
# ──────────────────────────────────────────────
general_router = APIRouter(prefix="/api/exit-details", tags=["general"])


def _exit_out(r: ExitDetail, names: dict) -> ExitDetailOut:
    return ExitDetailOut(
        id=r.id, employee_id=r.employee_id, employee_name=names.get(r.employee_id),
        separation_date=r.separation_date, interviewer_id=r.interviewer_id,
        interviewer_name=names.get(r.interviewer_id) if r.interviewer_id else None,
        reason=r.reason, feedback=r.feedback, status=r.status, created_at=r.created_at,
    )


@general_router.get("", response_model=List[ExitDetailOut])
def list_exit_details(db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    rows = (
        db.query(ExitDetail)
        .filter(ExitDetail.company_id == user.company_id)
        .order_by(ExitDetail.created_at.desc())
        .all()
    )
    names = _emp_name_map(db, user.company_id, [r.employee_id for r in rows] + [r.interviewer_id for r in rows])
    return [_exit_out(r, names) for r in rows]


@general_router.post("", response_model=ExitDetailOut)
def create_exit_detail(body: ExitDetailIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    emp = db.query(Employee).filter(Employee.id == body.employee_id, Employee.company_id == user.company_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    r = ExitDetail(company_id=user.company_id, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    names = _emp_name_map(db, user.company_id, [r.employee_id, r.interviewer_id])
    return _exit_out(r, names)


@general_router.put("/{exit_id}/status", response_model=ExitDetailOut)
def update_exit_status(
    exit_id: str, body: ExitStatusIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _require_hr(user)
    r = db.query(ExitDetail).filter(ExitDetail.id == exit_id, ExitDetail.company_id == user.company_id).first()
    if not r:
        raise HTTPException(404, "Exit detail not found")
    r.status = body.status
    db.commit()
    db.refresh(r)
    names = _emp_name_map(db, user.company_id, [r.employee_id, r.interviewer_id])
    return _exit_out(r, names)


# ──────────────────────────────────────────────
# Meetings (Dashboard calendar — click a date to schedule a meeting)
# ──────────────────────────────────────────────
meetings_router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _user_name_map(db: Session, company_id: str, user_ids: List[str]) -> dict:
    """Display name for a login account — prefers their linked employee's name,
    falls back to their email (covers admin accounts with no employee profile)."""
    ids = [i for i in set(user_ids) if i]
    if not ids:
        return {}
    rows = db.query(User).filter(User.id.in_(ids), User.company_id == company_id).all()
    emp_ids = [u.employee_id for u in rows if u.employee_id]
    emp_names = _emp_name_map(db, company_id, emp_ids)
    return {u.id: (emp_names.get(u.employee_id) or u.email) for u in rows}


def _meeting_out(m: Meeting, organizer_names: dict, participant_names: dict) -> MeetingOut:
    participant_ids = [p for p in (m.participant_ids or "").split(",") if p]
    return MeetingOut(
        id=m.id, title=m.title, description=m.description, meeting_date=m.meeting_date,
        start_time=m.start_time, end_time=m.end_time,
        organizer_id=m.organizer_id, organizer_name=organizer_names.get(m.organizer_id),
        participant_ids=participant_ids,
        participant_names=[participant_names[p] for p in participant_ids if p in participant_names],
        created_at=m.created_at,
    )


@meetings_router.get("", response_model=List[MeetingOut])
def list_meetings(
    month: int, year: int,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _, last_day = calendar_mod.monthrange(year, month)
    rows = (
        db.query(Meeting)
        .filter(
            Meeting.company_id == user.company_id,
            Meeting.meeting_date >= date(year, month, 1),
            Meeting.meeting_date <= date(year, month, last_day),
        )
        .order_by(Meeting.meeting_date, Meeting.start_time)
        .all()
    )
    organizer_names = _user_name_map(db, user.company_id, [r.organizer_id for r in rows])
    participant_ids = [p for r in rows for p in (r.participant_ids or "").split(",") if p]
    participant_names = _emp_name_map(db, user.company_id, participant_ids)
    return [_meeting_out(r, organizer_names, participant_names) for r in rows]


@meetings_router.post("", response_model=MeetingOut)
def create_meeting(body: MeetingIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if body.meeting_date < date.today():
        raise HTTPException(400, "Can't schedule a meeting on a past date")
    valid_participants = []
    if body.participant_ids:
        rows = db.query(Employee).filter(
            Employee.id.in_(body.participant_ids), Employee.company_id == user.company_id
        ).all()
        valid_participants = [e.id for e in rows]
    m = Meeting(
        company_id=user.company_id, title=body.title, description=body.description,
        meeting_date=body.meeting_date, start_time=body.start_time, end_time=body.end_time,
        organizer_id=user.id, participant_ids=",".join(valid_participants) or None,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    organizer_names = _user_name_map(db, user.company_id, [user.id])
    participant_names = _emp_name_map(db, user.company_id, valid_participants)
    return _meeting_out(m, organizer_names, participant_names)


@meetings_router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == user.company_id).first()
    if not m:
        return None
    if not (user.role in HR_ROLES or m.organizer_id == user.id):
        raise HTTPException(403, "Only the organizer or HR can cancel this meeting")
    db.delete(m)
    db.commit()
    return None
