# backend/app/schemas/assignment.py

from pydantic import BaseModel
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

# Reutilizamos el Enum de status de solicitudes
class RequestStatus(PyEnum):
    CREADA = "CREADA"
    ASIGNADA = "ASIGNADA"
    EN_CAMINO = "EN_CAMINO"
    EN_SITIO = "EN_SITIO"
    COMPLETADA = "COMPLETADA"
    FALLIDA = "FALLIDA"
    CANCELADA = "CANCELADA"


class AssignmentCreate(BaseModel):
    registration_id: str  # ID de la inscripción a la campaña
    collector_id: str     # ID del recolector (User con rol COLLECTOR)
    vehicle_plate: Optional[str] = None  # Placa del vehículo

    class Config:
        orm_mode = True


class AssignmentResponse(BaseModel):
    id: str
    registration_id: str
    collector_id: str
    company_id: str
    assigned_at: datetime
    vehicle_plate: str
    status: str
    created_at: datetime
    user_address: str
    user_full_name: str
    campaign_type_of_waste: str
    campaign_collection_date: datetime
    estimated_weight_kg: int
    campaign_zone: str

    class Config:
        orm_mode = True

class AssignmentComplete(BaseModel):
    notes: Optional[str] = None  # Notas del recolector
    weight_collected_kg: int     # Peso recolectado


class AssignmentResponse(BaseModel):
    id: str
    registration_id: str
    collector_id: str
    company_id: str
    assigned_at: datetime
    vehicle_plate: Optional[str] = None
    status: str
    created_at: datetime

    # Campos adicionales para el frontend
    user_address: str
    user_full_name: str
    campaign_type_of_waste: str
    campaign_collection_date: datetime
    estimated_weight_kg: int
    campaign_zone: str

    class Config:
        from_attributes = True