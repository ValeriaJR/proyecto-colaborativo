# backend/app/schemas/auth.py

from pydantic import BaseModel
from enum import Enum as PyEnum

class UserRole(PyEnum):
    ADMIN = "ADMIN"
    USER = "USER"
    COLLECTOR = "COLLECTOR"
    COMPANY = "COMPANY"

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: str
    role: str