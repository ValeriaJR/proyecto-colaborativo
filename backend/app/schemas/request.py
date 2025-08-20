# backend/app/schemas/request.py
from pydantic import BaseModel
from datetime import datetime
from enum import Enum as PyEnum

class WasteType(PyEnum):
    ORGANICO = "organico"
    INORGANICO = "inorganico"
    PELIGROSO = "peligroso"
    RECICLABLE = "reciclable"
    ELECTRONICO = "electronico"

class RequestCreate(BaseModel):
    type_of_waste: WasteType
    scheduled_date: datetime
    notes: str = None

class RequestResponse(RequestCreate):
    id: str
    user_id: str
    status: str
    created_at: datetime