from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from ..database import get_db
from ..models import Department, Designation, WorkLocation, Shift, User, Holiday
from ..schemas import DepartmentOut, DesignationOut, LocationOut, ShiftOut
from ..schemas.attendance import HolidayIn, HolidayOut
from .deps import current_user
from typing import List, Optional

router = APIRouter(prefix="/api/meta", tags=["meta"])

HR_ROLES = {"super_admin", "company_admin", "hr_manager"}

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(Department).filter(Department.company_id == user.company_id).order_by(Department.name).all()

@router.get("/designations", response_model=List[DesignationOut])
def list_designations(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(Designation).filter(Designation.company_id == user.company_id).order_by(Designation.title).all()

@router.get("/locations", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(WorkLocation).filter(WorkLocation.company_id == user.company_id).all()

@router.get("/shifts", response_model=List[ShiftOut])
def list_shifts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(Shift).filter(Shift.company_id == user.company_id).all()


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
