import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.config import settings
from ..database import get_db
from ..models import Company, Employee, User
from ..schemas import SupportTicketIn, SupportTicketOut
from .deps import current_user

router = APIRouter(prefix="/api/support", tags=["support"])


def _raiser_name(db: Session, user: User) -> str:
    if user.employee_id:
        emp = db.query(Employee).filter(Employee.id == user.employee_id).first()
        if emp:
            return f"{emp.first_name} {emp.last_name}".strip()
    return user.email.split("@")[0]


def _super_admin_company_id(db: Session, user: User) -> str:
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company or not company.super_admin_company_id:
        raise HTTPException(
            502,
            "Support isn't connected for this company yet — contact your administrator.",
        )
    return company.super_admin_company_id


@router.post("/tickets", response_model=SupportTicketOut)
def create_ticket(body: SupportTicketIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    company_id = _super_admin_company_id(db, user)
    try:
        resp = requests.post(
            f"{settings.SUPER_ADMIN_URL}/support-tickets/external",
            json={
                "company_id": company_id,
                "raised_by_name": _raiser_name(db, user),
                "raised_by_email": user.email,
                "subject": body.subject,
                "description": body.description,
                "priority": body.priority,
            },
            headers={"X-Provision-Secret": settings.PROVISION_SECRET},
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(502, f"Could not reach support system: {e}")
    return resp.json()


@router.get("/tickets", response_model=list[SupportTicketOut])
def list_tickets(db: Session = Depends(get_db), user: User = Depends(current_user)):
    company_id = _super_admin_company_id(db, user)
    try:
        resp = requests.get(
            f"{settings.SUPER_ADMIN_URL}/support-tickets/external",
            params={"company_id": company_id},
            headers={"X-Provision-Secret": settings.PROVISION_SECRET},
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(502, f"Could not reach support system: {e}")
    return resp.json()
