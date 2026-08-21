from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date
from ..database import get_db
from ..models import Department, Designation, WorkLocation, Shift, User, Holiday, Employee
from ..schemas import (
    DepartmentIn, DepartmentOut, DesignationIn, DesignationOut,
    LocationIn, LocationOut, ShiftIn, ShiftOut,
    ReassignDepartmentIn, ReassignDesignationIn,
)
from ..schemas.attendance import HolidayIn, HolidayOut
from .deps import current_user
from typing import List, Optional

router = APIRouter(prefix="/api/meta", tags=["meta"])

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}
ADMIN_ROLES = {"super_admin", "company_admin"}


def _require_hr(user: User):
    if user.role not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")


def _require_admin(user: User):
    """Deleting org-structure records (departments/designations/locations) is
    admin-only -- HR managers can create/edit but not delete."""
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only company admins can delete this")


def _dept_names(db: Session, company_id: str, depts: List[Department]) -> tuple[dict, dict]:
    lead_ids = [d.lead_id for d in depts if d.lead_id]
    parent_ids = [d.parent_id for d in depts if d.parent_id]
    leads = db.query(Employee).filter(Employee.id.in_(lead_ids)).all() if lead_ids else []
    parents = db.query(Department).filter(Department.id.in_(parent_ids)).all() if parent_ids else []
    lead_map = {e.id: f"{e.first_name} {e.last_name}".strip() for e in leads}
    parent_map = {p.id: p.name for p in parents}
    return lead_map, parent_map


def _dept_out(dept: Department, lead_map: dict, parent_map: dict) -> DepartmentOut:
    return DepartmentOut(
        id=dept.id, name=dept.name, code=dept.code, mail_alias=dept.mail_alias,
        lead_id=dept.lead_id, lead_name=lead_map.get(dept.lead_id),
        parent_id=dept.parent_id, parent_name=parent_map.get(dept.parent_id),
    )


@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    depts = db.query(Department).filter(Department.company_id == user.company_id).order_by(Department.name).all()
    lead_map, parent_map = _dept_names(db, user.company_id, depts)
    return [_dept_out(d, lead_map, parent_map) for d in depts]


@router.post("/departments", response_model=DepartmentOut)
def create_department(payload: DepartmentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    dept = Department(company_id=user.company_id, **payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    lead_map, parent_map = _dept_names(db, user.company_id, [dept])
    return _dept_out(dept, lead_map, parent_map)


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: str, payload: DepartmentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == user.company_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if payload.parent_id == dept.id:
        raise HTTPException(status_code=400, detail="A department cannot be its own parent")
    for k, v in payload.model_dump().items():
        setattr(dept, k, v)
    db.commit()
    db.refresh(dept)
    lead_map, parent_map = _dept_names(db, user.company_id, [dept])
    return _dept_out(dept, lead_map, parent_map)


@router.get("/departments/{dept_id}/employee-count")
def department_employee_count(dept_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    count = db.query(Employee).filter(
        Employee.department_id == dept_id, Employee.company_id == user.company_id
    ).count()
    return {"employee_count": count}


@router.put("/departments/{dept_id}/reassign", status_code=204)
def reassign_department_employees(
    dept_id: str, payload: ReassignDepartmentIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    """Move every employee out of this department (to another department, or unassigned)
    before it gets deleted."""
    _require_hr(user)
    if payload.to_department_id == dept_id:
        raise HTTPException(status_code=400, detail="Cannot move employees to the same department being deleted")
    if payload.to_department_id:
        target = db.query(Department).filter(
            Department.id == payload.to_department_id, Department.company_id == user.company_id
        ).first()
        if not target:
            raise HTTPException(status_code=404, detail="Target department not found")
    db.query(Employee).filter(
        Employee.department_id == dept_id, Employee.company_id == user.company_id
    ).update({"department_id": payload.to_department_id})
    db.commit()
    return None


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(dept_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == user.company_id).first()
    if not dept:
        return None
    try:
        db.delete(dept)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="This department is assigned to employees and cannot be deleted")
    return None


@router.get("/designations", response_model=List[DesignationOut])
def list_designations(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(Designation).filter(Designation.company_id == user.company_id).order_by(Designation.title).all()


@router.post("/designations", response_model=DesignationOut)
def create_designation(payload: DesignationIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    designation = Designation(company_id=user.company_id, **payload.model_dump())
    db.add(designation)
    db.commit()
    db.refresh(designation)
    return designation


@router.put("/designations/{designation_id}", response_model=DesignationOut)
def update_designation(designation_id: str, payload: DesignationIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    designation = db.query(Designation).filter(
        Designation.id == designation_id, Designation.company_id == user.company_id
    ).first()
    if not designation:
        raise HTTPException(status_code=404, detail="Designation not found")
    for k, v in payload.model_dump().items():
        setattr(designation, k, v)
    db.commit()
    db.refresh(designation)
    return designation


@router.get("/designations/{designation_id}/employee-count")
def designation_employee_count(designation_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    count = db.query(Employee).filter(
        Employee.designation_id == designation_id, Employee.company_id == user.company_id
    ).count()
    return {"employee_count": count}


@router.put("/designations/{designation_id}/reassign", status_code=204)
def reassign_designation_employees(
    designation_id: str, payload: ReassignDesignationIn,
    db: Session = Depends(get_db), user: User = Depends(current_user),
):
    _require_hr(user)
    if payload.to_designation_id == designation_id:
        raise HTTPException(status_code=400, detail="Cannot move employees to the same designation being deleted")
    if payload.to_designation_id:
        target = db.query(Designation).filter(
            Designation.id == payload.to_designation_id, Designation.company_id == user.company_id
        ).first()
        if not target:
            raise HTTPException(status_code=404, detail="Target designation not found")
    db.query(Employee).filter(
        Employee.designation_id == designation_id, Employee.company_id == user.company_id
    ).update({"designation_id": payload.to_designation_id})
    db.commit()
    return None


@router.delete("/designations/{designation_id}", status_code=204)
def delete_designation(designation_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    designation = db.query(Designation).filter(
        Designation.id == designation_id, Designation.company_id == user.company_id
    ).first()
    if not designation:
        return None
    try:
        db.delete(designation)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="This designation is assigned to employees and cannot be deleted")
    return None


@router.get("/locations", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(WorkLocation).filter(WorkLocation.company_id == user.company_id).all()


@router.post("/locations", response_model=LocationOut)
def create_location(payload: LocationIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    location = WorkLocation(company_id=user.company_id, **payload.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.put("/locations/{location_id}", response_model=LocationOut)
def update_location(location_id: str, payload: LocationIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    location = db.query(WorkLocation).filter(
        WorkLocation.id == location_id, WorkLocation.company_id == user.company_id
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    for k, v in payload.model_dump().items():
        setattr(location, k, v)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/locations/{location_id}", status_code=204)
def delete_location(location_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    location = db.query(WorkLocation).filter(
        WorkLocation.id == location_id, WorkLocation.company_id == user.company_id
    ).first()
    if not location:
        return None
    try:
        db.delete(location)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="This location is assigned to employees and cannot be deleted")
    return None


@router.get("/shifts", response_model=List[ShiftOut])
def list_shifts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(Shift).filter(Shift.company_id == user.company_id).all()


@router.post("/shifts", response_model=ShiftOut)
def create_shift(payload: ShiftIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    shift = Shift(company_id=user.company_id, **payload.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.put("/shifts/{shift_id}", response_model=ShiftOut)
def update_shift(shift_id: str, payload: ShiftIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    shift = db.query(Shift).filter(Shift.id == shift_id, Shift.company_id == user.company_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    for k, v in payload.model_dump().items():
        setattr(shift, k, v)
    db.commit()
    db.refresh(shift)
    return shift


@router.delete("/shifts/{shift_id}", status_code=204)
def delete_shift(shift_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    shift = db.query(Shift).filter(Shift.id == shift_id, Shift.company_id == user.company_id).first()
    if not shift:
        return None
    try:
        db.delete(shift)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="This shift is assigned to employees and cannot be deleted")
    return None


@router.get("/holidays", response_model=List[HolidayOut])
def list_holidays(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    year = year or date.today().year
    return (
        db.query(Holiday)
        .filter(
            Holiday.company_id == user.company_id,
            Holiday.is_active == True,  # noqa: E712
            Holiday.holiday_date >= date(year, 1, 1),
            Holiday.holiday_date <= date(year, 12, 31),
        )
        .order_by(Holiday.holiday_date)
        .all()
    )


@router.post("/holidays", response_model=HolidayOut)
def create_holiday(
    payload: HolidayIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if user.role not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    existing = db.query(Holiday).filter(
        Holiday.company_id == user.company_id,
        Holiday.holiday_date == payload.holiday_date,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A holiday already exists on that date")
    h = Holiday(company_id=user.company_id, **payload.model_dump())
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.delete("/holidays/{holiday_id}", status_code=204)
def delete_holiday(
    holiday_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if user.role not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    h = db.query(Holiday).filter(
        Holiday.id == holiday_id, Holiday.company_id == user.company_id
    ).first()
    if h:
        db.delete(h)
        db.commit()
    return None
