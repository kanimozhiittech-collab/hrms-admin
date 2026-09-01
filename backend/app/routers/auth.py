from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import LoginIn, TokenOut, Me, ChangePasswordIn
from ..core.security import verify_password, create_token, hash_password
from .deps import current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Your account has been disabled")
    token = create_token(user.id, {"role": user.role, "company_id": user.company_id})
    return TokenOut(access_token=token)

@router.get("/me", response_model=Me)
def me(user: User = Depends(current_user)):
    return Me(id=user.id, email=user.email, role=user.role,
              company_id=user.company_id, employee_id=user.employee_id,
              is_active=user.is_active, created_at=user.created_at)

@router.put("/me/password", status_code=204)
def change_my_password(body: ChangePasswordIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return None
