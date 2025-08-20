from datetime import datetime, timedelta
import json
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from app.api.dependencies.auth import get_current_user
from app.api.routes.auth import get_db
from app.infrastructure.db import session
from app.infrastructure.db.models import CampaignRegistration, User
from app.schemas.campaign import CampaignRegistrationResponse
from app.schemas.user import ReportResponse, UserResponse, UserRole, UserUpdate
from app.infrastructure.db.session import SessionLocal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select


router = APIRouter(tags=["Usuarios"])

def get_db():
    db = session.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "address": current_user.address,
        "phone": current_user.phone,
        "barrio": current_user.barrio,
        "company_id": str(current_user.company_id) if current_user.company_id else None,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at
    }


@router.get("/my-registrations", response_model=List[CampaignRegistrationResponse])
def get_my_registrations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Cargar inscripción + campaña + slot
    registrations = db.query(CampaignRegistration)\
        .options(
            joinedload(CampaignRegistration.campaign),
            joinedload(CampaignRegistration.slot)
        )\
        .filter(CampaignRegistration.user_id == current_user.id)\
        .all()

    return [
        {
            "id": str(reg.id),
            "campaign_id": str(reg.campaign_id),
            "user_id": str(reg.user_id),
            "address": reg.address,
            "estimated_weight_kg": reg.estimated_weight_kg,
            "status": reg.status,
            "notes": reg.notes,
            "created_at": reg.created_at,
            "campaign_collection_date": reg.campaign.collection_date,  # ✅ Nueva fecha
            "products": json.loads(reg.products) if reg.products else [],
            "slot_id": str(reg.slot_id) if reg.slot_id else None,
            "slot_time": reg.slot.slot_time.strftime("%H:%M") if reg.slot and reg.slot.slot_time else None
        }
        for reg in registrations
    ]

@router.get("/me/report")
def get_user_report(
    month: str = Query(..., description="Mes en formato YYYY-MM"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        year, month_num = map(int, month.split("-"))
        if month_num < 1 or month_num > 12:
            raise HTTPException(status_code=400, detail="Mes inválido")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de mes incorrecto")

    start_date = datetime(year, month_num, 1)
    end_date = datetime(year, month_num + 1, 1)

    # Obtener inscripciones del usuario
    regs = db.query(CampaignRegistration).filter(
        CampaignRegistration.user_id == str(current_user.id),
        CampaignRegistration.created_at >= start_date,
        CampaignRegistration.created_at < end_date
    ).all()

    # Agrupar por tipo de residuo
    report_data = {}
    for reg in regs:
        if reg.products:
            products = json.loads(reg.products) if isinstance(reg.products, str) else reg.products
            for p in products:
                name = p.get("product_name", "Otros")
                weight = p.get("weight_kg", 0)
                report_data[name] = report_data.get(name, 0) + weight

    return {
        "month": month,
        "registrations": [{"name": k, "weight_kg": v} for k, v in report_data.items()]
    }


@router.put("/me", response_model=UserResponse)
def update_user_profile(
    updates: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Actualiza los datos del perfil del usuario.
    """
    # 🔁 Cargar el usuario desde la sesión actual
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Aplicar actualizaciones
    for key, value in updates.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)  # ✅ Ahora sí, db_user está en la sesión actual

    return {
        "id": str(db_user.id),
        "full_name": db_user.full_name,
        "email": db_user.email,
        "address": db_user.address,
        "phone": db_user.phone,
        "barrio": db_user.barrio,
        "role": db_user.role.value,
        "is_active": db_user.is_active,
        "created_at": db_user.created_at

    }

@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    users = db.query(User).all()
    return [
        {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "address": user.address,
            "phone": user.phone,
            "barrio": user.barrio,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at
        }
        for user in users
    ]