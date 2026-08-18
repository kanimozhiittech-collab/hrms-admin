import secrets
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, Employee, Department
from ..schemas import UserCreateIn, UserRoleUpdateIn, UserProfileUpdateIn, UserOut, UserCreateOut
from ..core.security import hash_password
from .deps import current_user

router = APIRouter(prefix="/api/users", tags=["users"])

ASSIGNABLE_ROLES = {"company_admin", "hr_manager", "employee"}
HR_ROLES = {"super_admin", "company_admin", "hr_manager"}
# Kept in sync with employees.py — statuses that already mean "blocked", so a
# login toggle shouldn't downgrade e.g. Resigned/Terminated back to Inactive.
BLOCKING_STATUSES = {"Inactive", "Resigned", "Terminated"}


def _require_admin(user: User):
    if user.role not in {"super_admin", "company_admin"}:
        raise HTTPException(403, "Only company admins can manage user accounts")


def _require_hr(user: User):
    if user.role not in HR_ROLES:
        raise HTTPException(403, "Not authorized")


def _gen_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(10))


def _to_out(db: Session, target: User) -> UserOut:
    employee_name = None
    if target.employee_id:
        emp = db.query(Employee).filter(Employee.id == target.employee_id).first()
        if emp:
            employee_name = f"{emp.first_name} {emp.last_name}".strip()
    dept_name = None
    if target.assigned_department_id:
        dept = db.query(Department).filter(Department.id == target.assigned_department_id).first()
        if dept:
            dept_name = dept.name
    return UserOut(
        id=target.id, email=target.email, role=target.role, is_active=target.is_active,
        employee_id=target.employee_id, employee_name=employee_name,
        assigned_department_id=target.assigned_department_id, assigned_department_name=dept_name,
    )


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    users = db.query(User).filter(User.company_id == user.company_id).order_by(User.email).all()
    emp_ids = [u.employee_id for u in users if u.employee_id]
    emps = db.query(Employee).filter(Employee.id.in_(emp_ids)).all() if emp_ids else []
    name_map = {e.id: f"{e.first_name} {e.last_name}".strip() for e in emps}
    dept_ids = [u.assigned_department_id for u in users if u.assigned_department_id]
    depts = db.query(Department).filter(Department.id.in_(dept_ids)).all() if dept_ids else []
    dept_map = {d.id: d.name for d in depts}
    return [
        UserOut(
            id=u.id, email=u.email, role=u.role, is_active=u.is_active,
            employee_id=u.employee_id, employee_name=name_map.get(u.employee_id),
            assigned_department_id=u.assigned_department_id,
            assigned_department_name=dept_map.get(u.assigned_department_id),
        )
        for u in users
    ]


@router.post("", response_model=UserCreateOut)
def create_user(body: UserCreateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    if body.role not in ASSIGNABLE_ROLES:
        raise HTTPException(400, "Invalid role")
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(400, "A user with this email already exists")
    dept_name = None
    if body.assigned_department_id:
        dept = db.query(Department).filter(
            Department.id == body.assigned_department_id, Department.company_id == user.company_id
        ).first()
        if not dept:
            raise HTTPException(404, "Department not found")
        dept_name = dept.name

    temp_password = _gen_password()
    new_user = User(
        company_id=user.company_id, email=body.email, role=body.role,
        password_hash=hash_password(temp_password), is_active=True,
        assigned_department_id=body.assigned_department_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserCreateOut(
        id=new_user.id, email=new_user.email, role=new_user.role, is_active=new_user.is_active,
        employee_id=None, employee_name=None,
        assigned_department_id=new_user.assigned_department_id, assigned_department_name=dept_name,
        temp_password=temp_password,
    )


@router.put("/{user_id}", response_model=UserOut)
def update_profile(
    user_id: str, body: UserProfileUpdateIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _require_admin(user)
    target = db.query(User).filter(User.id == user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if body.email != target.email:
        existing = db.query(User).filter(User.email == body.email).first()
        if existing and existing.id != target.id:
            raise HTTPException(400, "A user with this email already exists")
    if body.employee_id:
        emp = db.query(Employee).filter(
            Employee.id == body.employee_id, Employee.company_id == user.company_id
        ).first()
        if not emp:
            raise HTTPException(404, "Employee not found")
    if body.assigned_department_id:
        dept = db.query(Department).filter(
            Department.id == body.assigned_department_id, Department.company_id == user.company_id
        ).first()
        if not dept:
            raise HTTPException(404, "Department not found")
    target.email = body.email
    target.employee_id = body.employee_id
    target.assigned_department_id = body.assigned_department_id
    db.commit()
    db.refresh(target)
    return _to_out(db, target)


@router.put("/{user_id}/role", response_model=UserOut)
def update_role(
    user_id: str, body: UserRoleUpdateIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _require_admin(user)
    if body.role not in ASSIGNABLE_ROLES:
        raise HTTPException(400, "Invalid role")
    target = db.query(User).filter(User.id == user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == user.id:
        raise HTTPException(400, "You cannot change your own role")
    target.role = body.role
    db.commit()
    db.refresh(target)
    return _to_out(db, target)


@router.put("/{user_id}/toggle", response_model=UserOut)
def toggle_active(user_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    target = db.query(User).filter(User.id == user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == user.id:
        raise HTTPException(400, "You cannot disable your own account")
    target.is_active = not target.is_active

    # Keep the linked employee's status in sync with the login toggle, so
    # Employees and Manage Accounts never show conflicting states.
    if target.employee_id:
        emp = db.query(Employee).filter(Employee.id == target.employee_id).first()
        if emp:
            if not target.is_active and emp.status not in BLOCKING_STATUSES:
                emp.status = "Inactive"
            elif target.is_active and emp.status == "Inactive":
                emp.status = "Active"

    db.commit()
    db.refresh(target)
    return _to_out(db, target)
