# backend/app/services/user_service.py

from app.infrastructure.repositories.user_repository import UserRepository
from app.core.security import hash_password
from uuid import uuid4

class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def register_user(self, user_data):
        # 1. Validar si el email ya existe
        if self.user_repository.get_by_email(user_data.email):
            raise ValueError("Email already registered")

        # 2. Preparar datos para el modelo
        user_dict = {
            "id": str(uuid4()),
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "address": user_data.address,
            "phone": user_data.phone,
            "company_id": user_data.company_id,
            "hashed_password": hash_password(user_data.password)  # ← Hasheado aquí
        }

        # 3. Crear usuario
        return self.user_repository.create(user_dict)