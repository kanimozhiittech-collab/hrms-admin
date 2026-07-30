from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import LoginIn, TokenOut, Me
from ..core.security import verify_password, create_token
from .deps import current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user.id, {"role": user.role, "company_id": user.company_id})
    return TokenOut(access_token=token)

@router.get("/me", response_model=Me)
def me(user: User = Depends(current_user)):
    return Me(id=user.id, email=user.email, role=user.role,
              company_id=user.company_id, employee_id=user.employee_id)
