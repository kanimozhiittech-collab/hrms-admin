import re

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import hash_password
from ..database import get_db
from ..models import Company, Shift, User, WorkLocation
from ..schemas import ProvisionCompanyIn
from ..seed import _add_holidays, _add_leave_types

router = APIRouter(prefix="/api/provisioning", tags=["provisioning"])


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "company"


def _require_provision_secret(x_provision_secret: str = Header(default="")):
    if x_provision_secret != settings.PROVISION_SECRET:
        raise HTTPException(403, "Invalid provisioning secret")


@router.post("/companies", status_code=201, dependencies=[Depends(_require_provision_secret)])
def provision_company(body: ProvisionCompanyIn, db: Session = Depends(get_db)):
    """Called by the Super Admin app right after it approves a company, so the
    admin's login actually exists here too (Super Admin only stores its own
    copy of the company/admin record — this is the tenant side)."""
    existing = db.query(User).filter(User.email == body.admin_email).first()
    if existing:
        return {"status": "already_exists", "company_id": existing.company_id}

    base_slug = _slugify(body.company_name)
    slug, n = base_slug, 1
    while db.query(Company).filter(Company.subdomain == slug).first():
        n += 1
        slug = f"{base_slug}-{n}"

    company = Company(name=body.company_name, subdomain=slug)
    db.add(company)
    db.flush()

    db.add(WorkLocation(company_id=company.id, name="Head Office"))
    db.add(Shift(company_id=company.id, name="General", start_time="09:30", end_time="18:30"))
    _add_leave_types(db, company.id)
    _add_holidays(db, company.id)

    admin = User(
        company_id=company.id, email=body.admin_email,
        password_hash=hash_password(body.temp_password), role="company_admin",
    )
    db.add(admin)
    db.commit()
    return {"status": "created", "company_id": company.id}
