import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.infrastructure.db.session import SessionLocal
from app.api.dependencies.auth import get_current_user
from app.infrastructure.db.models import CampaignRegistration
from app.domain.user import UserRole
from app.infrastructure.db.session import SessionLocal
from app.api.routes.auth import get_db


router = APIRouter(tags=["Reportes"])

@router.get("/users/me/report", response_model=dict)
def get_user_report(
    month: str = None,
    db: Session = Depends(SessionLocal),
    current_user = Depends(get_current_user)
):
    """
    Obtiene el informe de recolecciones por mes.
    """
    if not month:
        month = datetime.now().strftime("%Y-%m")

    year, month_num = map(int, month.split("-"))
    start_date = datetime(year, month_num, 1)
    end_date = start_date.replace(day=28) + timedelta(days=4)  # Último día del mes

    registrations = db.query(CampaignRegistration).filter(
        CampaignRegistration.user_id == current_user.id,
        CampaignRegistration.created_at >= start_date,
        CampaignRegistration.created_at <= end_date
    ).all()

    total_weight = sum(reg.estimated_weight_kg for reg in registrations)
    total_points = total_weight * 1  # Fórmula: 1 punto por kg

    return {
        "month": month,
        "total_weight_kg": total_weight,
        "total_points": total_points,
        "registrations": [
            {
                "date": reg.created_at.strftime("%Y-%m-%d"),
                "weight_kg": reg.estimated_weight_kg,
                "products": json.loads(reg.products) if reg.products else []
            }
            for reg in registrations
        ]
    }


router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/admin/", response_model=list)
def get_admin_reports(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    registrations = db.query(CampaignRegistration).all()

    data = []
    for reg in registrations:
        products = json.loads(reg.products) if reg.products else []
        barrio = reg.address.split(",")[-1].strip() if "," in reg.address else "Sin barrio"

        for product in products:
            data.append({
                "date": reg.created_at.strftime("%Y-%m-%d"),
                "localidad": barrio,
                "tipo": product.get("product_name", "Desconocido"),
                "cantidad": product.get("weight_kg", 0)
            })

    return data