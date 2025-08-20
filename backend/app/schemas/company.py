# backend/app/schemas/company.py
from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class CompanyBase(BaseModel):
    name: str

class CompanyCreate(CompanyBase):
    description: Optional[str] = None
    specialization: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class CompanyResponse(CompanyBase):
    id: str  # ✅ UUID como string

    model_config = {
        "from_attributes": True
    }