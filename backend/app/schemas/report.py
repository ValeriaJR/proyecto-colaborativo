# backend/app/schemas/report.py
from pydantic import BaseModel
from datetime import date

class ReportResponse(BaseModel):
    date: date
    localidad: str
    tipo: str
    cantidad: int