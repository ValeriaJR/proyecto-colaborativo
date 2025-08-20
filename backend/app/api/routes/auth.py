# backend/app/api/routes/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import SessionLocal
from app.services.user_service import UserService
from app.infrastructure.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, Token  # ✅ Usa LoginRequest
from app.core.security import verify_password, create_access_token
from app.infrastructure.db.models import User as UserModel
from app.schemas.user import UserCreate

router = APIRouter(tags=["Auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user_service(db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    return UserService(user_repo)

@router.post("/register", response_model=dict)
def register(user_data: UserCreate, service: UserService = Depends(get_user_service)):
    try:
        user = service.register_user(user_data)
        return {"message": "User created successfully", "user_id": user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):  # ✅ Usa LoginRequest
    user = db.query(UserModel).filter(UserModel.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_data = {"user_id": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    return {"access_token": access_token, "token_type": "bearer"}