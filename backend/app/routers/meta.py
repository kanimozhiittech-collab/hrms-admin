from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date
from ..database import get_db
from ..models import Department, Designation, WorkLocation, Shift, User, Holiday
from ..schemas import (
    DepartmentIn, DepartmentOut, DesignationIn, DesignationOut,
    LocationIn, LocationOut, ShiftIn, ShiftOut,
)
from ..schemas.attendance import HolidayIn, HolidayOut
from .deps import current_user
from typing import List, Optional

router = APIRouter(prefix="/api/meta", tags=["meta"])

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}


def _require_hr(user: User):
    if user.role not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(Department).filter(Department.company_id == user.company_id).order_by(Department.name).all()


@router.post("/departments", response_model=DepartmentOut)
def create_department(payload: DepartmentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    dept = Department(company_id=user.company_id, name=payload.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: str, payload: DepartmentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == user.company_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.name = payload.name
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(dept_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
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
    designation = Designation(company_id=user.company_id, title=payload.title)
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
    designation.title = payload.title
    db.commit()
    db.refresh(designation)
    return designation


@router.delete("/designations/{designation_id}", status_code=204)
def delete_designation(designation_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
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
    location = WorkLocation(company_id=user.company_id, name=payload.name)
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
    location.name = payload.name
    db.commit()
    db.refresh(location)
    return location


@router.delete("/locations/{location_id}", status_code=204)
def delete_location(location_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_hr(user)
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
