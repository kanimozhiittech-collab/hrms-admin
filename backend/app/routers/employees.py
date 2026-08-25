from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
import re
from typing import Optional
from ..database import get_db
from ..models import (Employee, EmployeeAddress, EducationRecord, ExperienceRecord,
                      Dependent, EmergencyContact, EmployeeDocument, Department, Designation, User,
                      LeaveBalance, LeaveRequest, Company)
from ..models.attendance import AttendanceLog, RegularizationRequest
from ..models.services import OrgFile
from ..schemas import EmployeeIn, EmployeeOut, EmployeeListResponse, EmployeeListItem, DocumentOut
from ..core.security import hash_password
from ..core.storage import save_upload
from .deps import current_user

router = APIRouter(prefix="/api/employees", tags=["employees"])

# Default password every new employee uses for their first login.
DEFAULT_EMPLOYEE_PASSWORD = "Welcome@123"

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}
ADMIN_ROLES = {"super_admin", "company_admin"}

# Employee statuses that should block that person's login until they're re-activated.
BLOCKING_STATUSES = {"Inactive", "Resigned", "Terminated"}


def _require_hr(user: User):
    if user.role not in HR_ROLES:
        raise HTTPException(403, "Only HR/Admin can access the employee directory")


def _require_admin(user: User):
    """Deleting an employee record is admin-only -- HR managers can create/edit
    but not permanently remove someone's profile."""
    if user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Only company admins can delete an employee")


def _company_code_prefix(name: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", name or "")
    if not words:
        return "EMP"
    if len(words) == 1:
        return words[0][:3].upper()
    return "".join(w[0] for w in words[:4]).upper()


def _generate_emp_code(db: Session, company_id: str, company_name: str) -> str:
    prefix = _company_code_prefix(company_name)
    n = db.query(Employee).filter(Employee.company_id == company_id).count() + 1
    code = f"{prefix}-{n:04d}"
    while db.query(Employee).filter(Employee.company_id == company_id, Employee.emp_code == code).first():
        n += 1
        code = f"{prefix}-{n:04d}"
    return code


def _dept_scope(user: User) -> Optional[str]:
    """Department an hr_manager is restricted to, if their account has one assigned.
    Returns None for super_admin/company_admin (always full access) and for
    hr_managers with no department assigned (unrestricted, backward-compatible)."""
    if user.role == "hr_manager" and user.assigned_department_id:
        return user.assigned_department_id
    return None


def _serialize(e: Employee) -> dict:
    d = {c.name: getattr(e, c.name) for c in Employee.__table__.columns}
    d["addresses"] = [{c.name: getattr(a, c.name) for c in EmployeeAddress.__table__.columns if c.name not in ("id","employee_id")} for a in e.addresses]
    d["education"] = [{c.name: getattr(x, c.name) for c in EducationRecord.__table__.columns if c.name != "employee_id"} for x in e.education]
    d["experience"] = [{c.name: getattr(x, c.name) for c in ExperienceRecord.__table__.columns if c.name != "employee_id"} for x in e.experience]
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
    scope = _dept_scope(user)
    if scope:
        qry = qry.filter(Employee.department_id == scope)
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


@router.get("/directory/list")
def employee_directory(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Lightweight, non-sensitive name list for pickers (e.g. meeting participants)
    that any authenticated user can call — unlike the full directory, which is HR-only."""
    rows = (
        db.query(Employee)
        .filter(Employee.company_id == user.company_id, Employee.status == "Active")
        .order_by(Employee.first_name)
        .all()
    )
    return [
        {"id": e.id, "name": f"{e.first_name} {e.last_name}".strip(), "emp_code": e.emp_code}
        for e in rows
    ]


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    # Employees may view only their own profile; HR can view anyone (unless
    # department-scoped, in which case only people in their own department).
    if user.role not in HR_ROLES and user.employee_id != emp_id:
        raise HTTPException(403, "You can only view your own profile")
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")
    scope = _dept_scope(user)
    if scope and e.department_id != scope and user.employee_id != emp_id:
        raise HTTPException(403, "This employee is outside your assigned department")
    return _serialize(e)


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(body: EmployeeIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    if db.query(Employee).filter(Employee.work_email == body.work_email).first():
        raise HTTPException(400, "Work email already exists")

    emp_code = body.emp_code
    if emp_code:
        if db.query(Employee).filter(Employee.company_id == user.company_id, Employee.emp_code == emp_code).first():
            raise HTTPException(400, "Employee code already exists")
    else:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        emp_code = _generate_emp_code(db, user.company_id, company.name if company else "")

    data = body.model_dump(exclude={"addresses", "education", "experience", "dependents", "emergency_contacts", "emp_code", "password"})
    e = Employee(company_id=user.company_id, emp_code=emp_code, **data)
    for a in body.addresses: e.addresses.append(EmployeeAddress(**a.model_dump()))
    edu_rows = [EducationRecord(**x.model_dump(exclude={"id"})) for x in body.education]
    exp_rows = [ExperienceRecord(**x.model_dump(exclude={"id"})) for x in body.experience]
    for r in edu_rows: e.education.append(r)
    for r in exp_rows: e.experience.append(r)
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
                password_hash=hash_password(body.password or DEFAULT_EMPLOYEE_PASSWORD),
                role="employee",
                employee_id=e.id,
                is_active=e.status not in BLOCKING_STATUSES,
            ))
            db.commit()

    result = _serialize(e)
    # Relationship collections lose submission order after refresh/expire — return
    # education/experience from the objects we appended in request order instead,
    # so the frontend can reliably map "row i" to "row i's real id" for file uploads.
    result["education"] = [{c.name: getattr(x, c.name) for c in EducationRecord.__table__.columns if c.name != "employee_id"} for x in edu_rows]
    result["experience"] = [{c.name: getattr(x, c.name) for c in ExperienceRecord.__table__.columns if c.name != "employee_id"} for x in exp_rows]
    return result


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: str, body: EmployeeIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")
    scope = _dept_scope(user)
    if scope and e.department_id != scope:
        raise HTTPException(403, "This employee is outside your assigned department")
    if scope and body.department_id != scope:
        raise HTTPException(403, "You can only assign employees to your own department")
    data = body.model_dump(exclude={"addresses", "education", "experience", "dependents", "emergency_contacts", "emp_code", "password"})
    for k, v in data.items(): setattr(e, k, v)
    if body.emp_code:
        e.emp_code = body.emp_code
    e.addresses.clear(); e.education.clear(); e.experience.clear(); e.dependents.clear(); e.emergency_contacts.clear()
    for a in body.addresses: e.addresses.append(EmployeeAddress(**a.model_dump()))
    edu_rows = [EducationRecord(**x.model_dump(exclude={"id"})) for x in body.education]
    exp_rows = [ExperienceRecord(**x.model_dump(exclude={"id"})) for x in body.experience]
    for r in edu_rows: e.education.append(r)
    for r in exp_rows: e.experience.append(r)
    for x in body.dependents: e.dependents.append(Dependent(**x.model_dump()))
    for x in body.emergency_contacts: e.emergency_contacts.append(EmergencyContact(**x.model_dump()))

    # Keep the employee's login access in sync with their status — resigning/deactivating
    # an employee here should immediately block them from signing in, and vice versa.
    # An employee can have more than one login linked (their own auto-created
    # account, plus any manually linked from Manage Accounts) — sync all of them.
    for login in db.query(User).filter(User.employee_id == emp_id).all():
        login.is_active = e.status not in BLOCKING_STATUSES
        if body.password:
            login.password_hash = hash_password(body.password)

    db.commit(); db.refresh(e)
    result = _serialize(e)
    result["education"] = [{c.name: getattr(x, c.name) for c in EducationRecord.__table__.columns if c.name != "employee_id"} for x in edu_rows]
    result["experience"] = [{c.name: getattr(x, c.name) for c in ExperienceRecord.__table__.columns if c.name != "employee_id"} for x in exp_rows]
    return result


@router.delete("/{emp_id}", status_code=204)
def delete_employee(emp_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")

    # Detach dependents before deleting, so we don't crash on FK constraints
    # for things that shouldn't block a deletion outright. An employee can have
    # more than one login linked (their own auto-created account, plus any
    # manually linked from Manage Accounts) — clean up every one of them.
    logins = db.query(User).filter(User.employee_id == emp_id).all()
    db.query(Employee).filter(Employee.reporting_manager_id == emp_id).update({"reporting_manager_id": None})
    for login in logins:
        # This employee's login may have reviewed other people's leave/regularization
        # requests as a manager — detach those before the login row itself is deleted.
        db.query(LeaveRequest).filter(LeaveRequest.reviewed_by == login.id).update({"reviewed_by": None})
        db.query(RegularizationRequest).filter(RegularizationRequest.reviewed_by == login.id).update({"reviewed_by": None})
        db.query(OrgFile).filter(OrgFile.uploaded_by == login.id).update({"uploaded_by": None})
    db.query(AttendanceLog).filter(AttendanceLog.employee_id == emp_id).delete()
    db.query(RegularizationRequest).filter(RegularizationRequest.employee_id == emp_id).delete()
    db.query(LeaveRequest).filter(LeaveRequest.employee_id == emp_id).delete()
    db.query(LeaveBalance).filter(LeaveBalance.employee_id == emp_id).delete()
    for login in logins:
        db.delete(login)
        db.flush()  # SQLAlchemy won't auto-order this delete before the Employee's without a flush

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
    file_name, file_url = save_upload(file, "employee-documents")
    doc = EmployeeDocument(employee_id=e.id, doc_type=doc_type, file_name=file_name, file_url=file_url)
    db.add(doc); db.commit(); db.refresh(doc)
    return doc


@router.post("/{emp_id}/photo", response_model=EmployeeOut)
def upload_photo(emp_id: str, file: UploadFile = File(...),
                 db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role not in HR_ROLES and user.employee_id != emp_id:
        raise HTTPException(403, "Not authorized")
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.company_id == user.company_id).first()
    if not e: raise HTTPException(404, "Not found")
    _, e.photo_url = save_upload(file, "employee-photos")
    db.commit(); db.refresh(e)
    return _serialize(e)


def _save_upload(file: UploadFile) -> tuple[str, str]:
    return save_upload(file, "employee-documents")


@router.post("/{emp_id}/education/{edu_id}/file")
def upload_education_file(emp_id: str, edu_id: str, file: UploadFile = File(...),
                          db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role not in HR_ROLES and user.employee_id != emp_id:
        raise HTTPException(403, "Not authorized")
    row = (db.query(EducationRecord)
           .join(Employee, Employee.id == EducationRecord.employee_id)
           .filter(EducationRecord.id == edu_id, EducationRecord.employee_id == emp_id,
                   Employee.company_id == user.company_id)
           .first())
    if not row: raise HTTPException(404, "Not found")
    row.file_name, row.file_url = _save_upload(file)
    db.commit()
    return {"id": row.id, "file_name": row.file_name, "file_url": row.file_url}


@router.post("/{emp_id}/experience/{exp_id}/file")
def upload_experience_file(emp_id: str, exp_id: str, file: UploadFile = File(...),
                           db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role not in HR_ROLES and user.employee_id != emp_id:
        raise HTTPException(403, "Not authorized")
    row = (db.query(ExperienceRecord)
           .join(Employee, Employee.id == ExperienceRecord.employee_id)
           .filter(ExperienceRecord.id == exp_id, ExperienceRecord.employee_id == emp_id,
                   Employee.company_id == user.company_id)
           .first())
    if not row: raise HTTPException(404, "Not found")
    row.file_name, row.file_url = _save_upload(file)
    db.commit()
    return {"id": row.id, "file_name": row.file_name, "file_url": row.file_url}
