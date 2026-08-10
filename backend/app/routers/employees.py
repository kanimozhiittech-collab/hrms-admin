from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from pathlib import Path
import shutil, tempfile, uuid
from typing import Optional
from ..database import get_db
from ..models import (Employee, EmployeeAddress, EducationRecord, ExperienceRecord,
                      Dependent, EmergencyContact, EmployeeDocument, Department, Designation, User)
from ..schemas import EmployeeIn, EmployeeOut, EmployeeListResponse, EmployeeListItem, DocumentOut
from ..core.security import hash_password
from .deps import current_user

router = APIRouter(prefix="/api/employees", tags=["employees"])
# Serverless filesystems (e.g. Vercel) are read-only outside the OS temp dir,
# so store there instead of a project-relative "uploads" folder.
UPLOAD_DIR = Path(tempfile.gettempdir()) / "hrms_uploads"

# Default password every new employee uses for their first login.
DEFAULT_EMPLOYEE_PASSWORD = "Welcome@123"

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}


def _require_hr(user: User):
    if user.role not in HR_ROLES:
        raise HTTPException(403, "Only HR/Admin can access the employee directory")


def _serialize(e: Employee) -> dict:
    d = {c.name: getattr(e, c.name) for c in Employee.__table__.columns}
    d["addresses"] = [{c.name: getattr(a, c.name) for c in EmployeeAddress.__table__.columns if c.name not in ("id","employee_id")} for a in e.addresses]
    d["education"] = [{c.name: getattr(x, c.name) for c in EducationRecord.__table__.columns if c.name not in ("id","employee_id")} for x in e.education]
    d["experience"] = [{c.name: getattr(x, c.name) for c in ExperienceRecord.__table__.columns if c.name not in ("id","employee_id")} for x in e.experience]
    d["dependents"] = [{c.name: getattr(x, c.name) for c in Dependent.__table__.columns if c.name not in ("id","employee_id")} for x in e.dependents]
    d["emergency_contacts"] = [{c.name: getattr(x, c.name) for c in EmergencyContact.__table__.columns if c.name not in ("id","employee_id")} for x in e.emergency_contacts]
    d["documents"] = [DocumentOut.model_validate(x).model_dump() for x in e.documents]
    return d


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    q: Optional[str] = None,
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    _require_hr(user)
    qry = db.query(Employee).filter(Employee.company_id == user.company_id)
    if q:
        like = f"%{q.lower()}%"
        qry = qry.filter(or_(
            func.lower(Employee.first_name).like(like),
            func.lower(Employee.last_name).like(like),
            func.lower(Employee.work_email).like(like),
            func.lower(Employee.emp_code).like(like),
        ))
    if department_id:
        qry = qry.filter(Employee.department_id == department_id)
    if status:
        qry = qry.filter(Employee.status == status)
    total = qry.count()
    rows = (qry.order_by(Employee.created_at.desc())
            .offset((page-1)*page_size).limit(page_size).all())
    # fetch dept/desig names
    dept_map = {d.id: d.name for d in db.query(Department).filter(Department.company_id == user.company_id).all()}
    desig_map = {d.id: d.title for d in db.query(Designation).filter(Designation.company_id == user.company_id).all()}
    items = [EmployeeListItem(
        id=r.id, emp_code=r.emp_code, first_name=r.first_name, last_name=r.last_name,
        work_email=r.work_email, mobile=r.mobile,
        department=dept_map.get(r.department_id), designation=desig_map.get(r.designation_id),
        employee_type=r.employee_type, status=r.status, photo_url=r.photo_url,
        date_of_joining=r.date_of_joining, reporting_manager_id=r.reporting_manager_id,
    ) for r in rows]
    return EmployeeListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/files/{fname}")
def get_file(fname: str):
    fpath = UPLOAD_DIR / fname
    if not fpath.exists(): raise HTTPException(404)
    return FileResponse(fpath)


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    # Employees may view only their own profile; HR can view anyone.
    if user.role not in HR_ROLES and user.employee_id != emp_id:
        raise HTTPException(403, "You can only view your own profile")
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")
    return _serialize(e)


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(body: EmployeeIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    if db.query(Employee).filter(Employee.work_email == body.work_email).first():
        raise HTTPException(400, "Work email already exists")
    if db.query(Employee).filter(Employee.company_id == user.company_id, Employee.emp_code == body.emp_code).first():
        raise HTTPException(400, "Employee code already exists")

    data = body.model_dump(exclude={"addresses", "education", "experience", "dependents", "emergency_contacts"})
    e = Employee(company_id=user.company_id, **data)
    for a in body.addresses: e.addresses.append(EmployeeAddress(**a.model_dump()))
    for x in body.education: e.education.append(EducationRecord(**x.model_dump()))
    for x in body.experience: e.experience.append(ExperienceRecord(**x.model_dump()))
    for x in body.dependents: e.dependents.append(Dependent(**x.model_dump()))
    for x in body.emergency_contacts: e.emergency_contacts.append(EmergencyContact(**x.model_dump()))
    db.add(e); db.commit(); db.refresh(e)

    # Auto-create a login account for the employee (role=employee) so they can sign in.
    if e.work_email:
        existing = db.query(User).filter(User.email == e.work_email).first()
        if not existing:
            db.add(User(
                company_id=user.company_id,
                email=e.work_email,
                password_hash=hash_password(DEFAULT_EMPLOYEE_PASSWORD),
                role="employee",
                employee_id=e.id,
            ))
            db.commit()

    return _serialize(e)


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: str, body: EmployeeIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")
    data = body.model_dump(exclude={"addresses", "education", "experience", "dependents", "emergency_contacts"})
    for k, v in data.items(): setattr(e, k, v)
    e.addresses.clear(); e.education.clear(); e.experience.clear(); e.dependents.clear(); e.emergency_contacts.clear()
    for a in body.addresses: e.addresses.append(EmployeeAddress(**a.model_dump()))
    for x in body.education: e.education.append(EducationRecord(**x.model_dump()))
    for x in body.experience: e.experience.append(ExperienceRecord(**x.model_dump()))
    for x in body.dependents: e.dependents.append(Dependent(**x.model_dump()))
    for x in body.emergency_contacts: e.emergency_contacts.append(EmergencyContact(**x.model_dump()))
    db.commit(); db.refresh(e)
    return _serialize(e)


@router.delete("/{emp_id}", status_code=204)
def delete_employee(emp_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")

    # Detach dependents before deleting, so we don't crash on FK constraints
    # for things that shouldn't block a deletion outright.
    db.query(User).filter(User.employee_id == emp_id).delete()
    db.query(Employee).filter(Employee.reporting_manager_id == emp_id).update({"reporting_manager_id": None})

    try:
        db.delete(e)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "This employee is referenced by other records and cannot be deleted")


@router.post("/{emp_id}/documents", response_model=DocumentOut)
def upload_document(emp_id: str, doc_type: str = Form(...), file: UploadFile = File(...),
                    db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role not in HR_ROLES and user.employee_id != emp_id:
        raise HTTPException(403, "Not authorized")
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")
    ext = Path(file.filename or "").suffix
    fname = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    fpath = UPLOAD_DIR / fname
    with fpath.open("wb") as f: shutil.copyfileobj(file.file, f)
    doc = EmployeeDocument(employee_id=e.id, doc_type=doc_type,
                           file_name=file.filename or fname,
                           file_url=f"/api/employees/files/{fname}")
    db.add(doc); db.commit(); db.refresh(doc)
    return doc
