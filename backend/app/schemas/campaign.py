# backend/app/schemas/campaign.py

from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional
from pydantic import BaseModel, field_validator

# === Enumeraciones ===

class WasteType(PyEnum):
    ORGANICO = "organico"
    INORGANICO = "inorganico"
    PELIGROSO = "peligroso"
    ELECTRONICO = "electronico"
    MUEBLES = "muebles"


# === Productos (para múltiples residuos) ===

class ProductItem(BaseModel):
    product_name: str
    weight_kg: float
    quantity: int

    class Config:
        from_attributes = True


# === Campañas ===

class CampaignCreate(BaseModel):
    type_of_waste: WasteType
    collection_date: datetime
    zone: str
    max_capacity_kg: Optional[int] = None
    company_id: str
    slot_times: List[str]  # Ej: ["09:00", "10:30"]

    @field_validator("slot_times")
    @classmethod
    def validate_slot_times(cls, v):
        for t in v:
            try:
                datetime.strptime(t, "%H:%M")
            except ValueError:
                raise ValueError(f"Formato de hora inválido: {t}. Usa HH:MM")
        return v

    class Config:
        from_attributes = True
        use_enum_values = True


class CampaignResponse(BaseModel):
    id: str
    type_of_waste: str
    collection_date: datetime
    zone: str
    max_capacity_kg: Optional[int] = None
    current_weight_kg: int
    company_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# === Inscripciones a campañas ===

class CampaignRegistrationCreate(BaseModel):
    address: str
    estimated_weight_kg: int
    notes: Optional[str] = None
    products: List[ProductItem]
    slot_id: str # ID del horario seleccionado

    class Config:
        from_attributes = True


class CampaignRegistrationResponse(BaseModel):
    id: str
    campaign_id: str
    user_id: str
    address: str
    estimated_weight_kg: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    products: List[ProductItem]  # ✅ Incluye productos en la respuesta
    slot_id: Optional[str] = None  # ID del horario asignado
    slot_time: Optional[str] = None
    campaign_collection_date: Optional[datetime] = None  # Fecha de recolección de la campaña

    class Config:
        from_attributes = True


# === Listar campañas ===

class CampaignSlotResponse(BaseModel):
    id: str
    campaign_id: str
    slot_time: str  # o time, dependiendo de cómo lo almacenes
    is_available: bool

    class Config:
        from_attributes = True 

class CampaignResponse(BaseModel):
    id: str
    type_of_waste: str
    collection_date: datetime
    zone: str
    max_capacity_kg: Optional[int] = None
    current_weight_kg: int
    company_id: str
    is_active: bool
    created_at: datetime
    slots: List[CampaignSlotResponse]  # ✅ Horarios disponibles

    class Config:
        from_attributes = True


class CampaignRegistrationAdminResponse(BaseModel):
    id: str
    campaign_id: str
    user_id: str
    address: str
    estimated_weight_kg: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    products: List[ProductItem]

    # Campos adicionales para el admin
    barrio: Optional[str] = None
    direccion_corta: Optional[str] = None
    fecha_recoleccion: Optional[str] = None
    hora_recoleccion: Optional[str] = None

    class Config:
        from_attributes = True