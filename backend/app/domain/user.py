# backend/app/domain/user.py
from enum import Enum
from datetime import datetime
from typing import Optional

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"
    COLLECTOR = "COLLECTOR"
    COMPANY = "COMPANY"

class User:
    def __init__(
        self,
        email: str,
        hashed_password: str,
        full_name: str,
        role: UserRole,
        id: str = None,
        address: str = None,
        phone: str = None,
        is_active: bool = True,
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        self.id = id
        self.email = email
        self.hashed_password = hashed_password
        self.full_name = full_name
        self.role = role
        self.address = address
        self.phone = phone
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()