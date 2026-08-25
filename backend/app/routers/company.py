import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from PIL import Image
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Company, User
from ..schemas import CompanyUpdateIn, CompanyOut
from ..core.storage import save_bytes
from .deps import current_user

router = APIRouter(prefix="/api/company", tags=["company"])

LOGO_MAX_BYTES = 500 * 1024
LOGO_WIDTH = 80
LOGO_HEIGHT = 55


def _require_admin(user: User):
    if user.role not in {"super_admin", "company_admin"}:
        raise HTTPException(403, "Only company admins can edit organization details")


@router.get("", response_model=CompanyOut)
def get_company(db: Session = Depends(get_db), user: User = Depends(current_user)):
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@router.put("", response_model=CompanyOut)
def update_company(body: CompanyUpdateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(company, k, v)
    db.commit()
    db.refresh(company)
    return company


@router.post("/logo", response_model=CompanyOut)
def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    _require_admin(user)
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    raw = file.file.read()
    if len(raw) > LOGO_MAX_BYTES:
        raise HTTPException(400, f"Logo must be {LOGO_MAX_BYTES // 1024}KB or smaller")
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()
        img = Image.open(io.BytesIO(raw))  # re-open: verify() leaves the image unusable
    except Exception:
        raise HTTPException(400, "Invalid image file")
    if img.width != LOGO_WIDTH or img.height != LOGO_HEIGHT:
        raise HTTPException(
            400, f"Logo must be exactly {LOGO_WIDTH}x{LOGO_HEIGHT}px (uploaded image is {img.width}x{img.height}px)"
        )

    _, company.logo_url = save_bytes(raw, file.filename, "company-logos")
    db.commit()
    db.refresh(company)
    return company
