import shutil
import uuid
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee, OrgFile, LetterRequest, HrTask, ExitDetail, User
from ..schemas import (
    OrgFileOut,
    LetterRequestIn, LetterStatusIn, LetterRequestOut,
    TaskIn, TaskStatusIn, TaskOut,
    ExitDetailIn, ExitStatusIn, ExitDetailOut,
)
from .deps import current_user

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}
UPLOAD_DIR = Path(tempfile.gettempdir()) / "hrms_uploads"


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
    _require_hr(user)
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
    ext = Path(file.filename or "").suffix
    fname = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    fpath = UPLOAD_DIR / fname
    with fpath.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    org_file = OrgFile(
        company_id=user.company_id, name=name, description=description or None,
        folder=folder or None, file_url=f"/api/files/raw/{fname}", uploaded_by=user.id,
    )
    db.add(org_file)
    db.commit()
    db.refresh(org_file)
    return org_file


@files_router.get("/raw/{fname}")
def get_file(fname: str, user: User = Depends(current_user)):
    _require_hr(user)
    fpath = UPLOAD_DIR / fname
    if not fpath.exists():
        raise HTTPException(404)
    return FileResponse(fpath)


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
