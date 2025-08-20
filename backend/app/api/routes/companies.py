# backend/app/api/routes/companies.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.models import Company
import uuid
from app.api.dependencies.auth import get_current_user
from app.domain.user import UserRole
from app.services.company_service import CompanyService
from app.infrastructure.repositories.company_repository import CompanyRepository
from app.schemas.company import CompanyResponse

router = APIRouter(prefix="/companies", tags=["Empresas"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=dict)
def create_company(name: str, db: Session = Depends(get_db)):
    company = Company(
        id=str(uuid.uuid4()),
        name=name,
        contact_email=f"contacto@{name.lower().replace(' ', '')}.com",
        is_active=True
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return {"message": "Empresa creada", "company_id": company.id}

@router.get("/companies/", response_model=list[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Lista todas las empresas recolectoras.
    Solo accesible para ADMIN.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    companies = db.query(Company).all()

    return [
        {
            "id": str(company.id),  # ✅ Convertimos UUID a string
            "name": company.name
        }
        for company in companies
    ]