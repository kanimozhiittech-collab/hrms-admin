import shutil
import uuid
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Company, User
from ..schemas import CompanyUpdateIn, CompanyOut
from .deps import current_user

router = APIRouter(prefix="/api/company", tags=["company"])
UPLOAD_DIR = Path(tempfile.gettempdir()) / "hrms_uploads"


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
    ext = Path(file.filename or "").suffix
    fname = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    fpath = UPLOAD_DIR / fname
    with fpath.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    company.logo_url = f"/api/company/logo/{fname}"
    db.commit()
    db.refresh(company)
    return company


@router.get("/logo/{fname}")
def get_logo(fname: str):
    fpath = UPLOAD_DIR / fname
    if not fpath.exists():
        raise HTTPException(404)
    return FileResponse(fpath)
