# backend/app/repositories/company_repository.py
from sqlalchemy.orm import Session
from app.infrastructure.db.models import Company

class CompanyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self):
        return self.db.query(Company).all()

    def get_by_id(self, company_id):
        return self.db.query(Company).filter(Company.id == company_id).first()

    def create(self, company_data: dict):
        company = Company(**company_data)
        self.db.add(company)
        self.db.commit()
        self.db.refresh(company)
        return company