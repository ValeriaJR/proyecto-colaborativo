# backend/app/infrastructure/repositories/user_repository.py

from sqlalchemy.orm import Session
from app.infrastructure.db.models import User as UserModel

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str):
        return self.db.query(UserModel).filter(UserModel.email == email).first()

    def get_by_id(self, user_id: str):
        return self.db.query(UserModel).filter(UserModel.id == user_id).first()

    def create(self, user_data: dict):
        """
        user_data: dict con claves: id, email, hashed_password, full_name, role, address, phone
        """
        db_user = UserModel(**user_data)
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user