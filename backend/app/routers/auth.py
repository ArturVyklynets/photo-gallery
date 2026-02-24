from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from ..database import get_db
from ..models import User
from ..schemas import UserRegister, UserLogin, TokenResponse
import os

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"])

def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    )
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        os.getenv("SECRET_KEY"),
        algorithm=os.getenv("ALGORITHM")
    )

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email вже використовується")

    user = User(
        email=data.email,
        name=data.name,
        password=pwd_context.hash(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"access_token": create_token(user.id)}

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not pwd_context.verify(data.password, user.password):
        raise HTTPException(status_code=401, detail="Невірний email або пароль")

    return {"access_token": create_token(user.id)}
