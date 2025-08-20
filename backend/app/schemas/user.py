# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, field_validator
from enum import Enum as PyEnum
from typing import Dict, List, Optional, Union
from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from app.core.security import hash_password
from app.infrastructure.repositories.user_repository import UserRepository

class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    USER = "USER"
    COLLECTOR = "COLLECTOR"
    COMPANY = "COMPANY"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    address: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    password: str
    address: Optional[str] = None
    phone: Optional[str] = None
    company_id: Optional[str] = None  # ✅ Sigue siendo string (para entrada)

    @field_validator("company_id")
    @classmethod
    def validate_company_id(cls, v):
        if not v:
            return None  # ✅ Si está vacío o None, devuelve None
        try:
            # ✅ Intenta convertir a UUID
            PyUUID(v)
            return v  # ✅ Si es válido, guárdalo como string
        except (ValueError, TypeError):
            raise ValueError("Invalid UUID format for company_id")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    address: Optional[str] = None
    phone: Optional[str] = None
    barrio: Optional[str] = None
    company_id: Optional[str] = None
    is_active: bool  # ✅ Añadido
    created_at: datetime  # ✅ Añadido
    updated_at: Optional[datetime] = None  # ✅ Añadido

    class Config:
        from_attributes = True 
        extra = "ignore"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    barrio: Optional[str] = None

    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    month: str
    registrations: List[Dict[str, Union[str, int]]]


class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def register_user(self, user_data: UserCreate):
        # 1. Validar si el email ya existe
        if self.user_repository.get_by_email(user_data.email):
            raise ValueError("Email already registered")

        # 2. Preparar datos para el modelo
        company_id = None
        if user_data.company_id:
            try:
                company_id = PyUUID(user_data.company_id)  # ✅ Convierte a UUID
            except (ValueError, TypeError):
                raise ValueError("Invalid UUID format for company_id")

        user_dict = {
            "id": PyUUID(user_data.id) if user_data.id else PyUUID(str(uuid4())),
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "address": user_data.address,
            "phone": user_data.phone,
            "company_id": company_id,  # ✅ Ahora es UUID o None
            "hashed_password": hash_password(user_data.password)
        }

        # 3. Crear usuario
        return self.user_repository.create(user_dict)