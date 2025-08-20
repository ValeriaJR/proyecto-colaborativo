import json
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.models import Campaign, CampaignRegistration, CampaignSlot, User, Company
from app.schemas.campaign import CampaignCreate, CampaignRegistrationAdminResponse, CampaignResponse, CampaignRegistrationCreate, CampaignRegistrationResponse, CampaignSlotResponse
from app.api.dependencies.auth import get_current_user
from app.infrastructure.db.models import UserRole
import uuid
from datetime import datetime, time

router = APIRouter(prefix="/campaigns", tags=["Campañas"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    campaign_: CampaignCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador puede crear campañas"
        )

    company = db.query(Company).filter(Company.id == campaign_.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # ✅ Crear campaña
    db_campaign = Campaign(
        id=uuid.uuid4(),
        type_of_waste=campaign_.type_of_waste,
        collection_date=campaign_.collection_date,
        zone=campaign_.zone,
        max_capacity_kg=campaign_.max_capacity_kg,
        company_id=campaign_.company_id,
        current_weight_kg=0,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(db_campaign)

    # ✅ Crear los horarios (slots)
    for slot_time_str in campaign_.slot_times:
        # Convertir string "HH:MM" a objeto time
        hour, minute = map(int, slot_time_str.split(":"))
        slot_time = time(hour=hour, minute=minute)

        db_slot = CampaignSlot(
            id=uuid.uuid4(),
            campaign_id=db_campaign.id,
            slot_time=slot_time,
            is_available=True
        )
        db.add(db_slot)

    db.commit()
    db.refresh(db_campaign)

    # ✅ Retornar con slots formateados
    return {
        "id": str(db_campaign.id),
        "type_of_waste": db_campaign.type_of_waste,
        "collection_date": db_campaign.collection_date,
        "zone": db_campaign.zone,
        "max_capacity_kg": db_campaign.max_capacity_kg,
        "current_weight_kg": db_campaign.current_weight_kg,
        "company_id": str(db_campaign.company_id),
        "is_active": db_campaign.is_active,
        "created_at": db_campaign.created_at,
        "slots": [
            {
                "id": str(slot.id),
                "campaign_id": str(slot.campaign_id),  # ✅ Incluido
                "slot_time": slot.slot_time.strftime("%H:%M"),  # ✅ Formateado
                "is_available": slot.is_available
            }
            for slot in db_campaign.slots
        ]
    }


@router.post("/{campaign_id}/register", response_model=CampaignRegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_for_campaign(
    campaign_id: str,
    registration_: CampaignRegistrationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # ✅ Verificar que la campaña exista
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    # ✅ Verificar que el horario (slot) exista y pertenezca a la campaña
    slot = db.query(CampaignSlot).filter(
        CampaignSlot.id == registration_.slot_id,
        CampaignSlot.campaign_id == campaign_id
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Horario no válido o no pertenece a esta campaña")

    # ✅ Verificar que el horario esté disponible
    if not slot.is_available:
        raise HTTPException(status_code=400, detail="El horario seleccionado ya no está disponible")

    # ✅ Verificar que el usuario no esté ya inscrito
    existing = db.query(CampaignRegistration).filter(
        CampaignRegistration.campaign_id == campaign_id,
        CampaignRegistration.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ya estás inscrito en esta campaña"
        )

    # ✅ Crear inscripción
    db_registration = CampaignRegistration(
        id=uuid.uuid4(),
        campaign_id=campaign_id,
        user_id=current_user.id,
        address=registration_.address,
        estimated_weight_kg=registration_.estimated_weight_kg,
        notes=registration_.notes,
        status="CREADA",
        created_at=datetime.utcnow(),
        products=json.dumps([p.dict() for p in registration_.products]),  # Guardar como JSON
        slot_id=registration_.slot_id
    )
    db.add(db_registration)

    # ✅ Marcar el horario como no disponible
    slot.is_available = False

    db.commit()
    db.refresh(db_registration)

    return {
        "id": str(db_registration.id),
        "campaign_id": str(db_registration.campaign_id),
        "user_id": str(db_registration.user_id),
        "address": db_registration.address,
        "estimated_weight_kg": db_registration.estimated_weight_kg,
        "status": db_registration.status,
        "notes": db_registration.notes,
        "created_at": db_registration.created_at,
        "products": [p.dict() for p in registration_.products]
    }


@router.get("/registrations", response_model=List[CampaignRegistrationResponse])
def list_all_registrations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    registrations = db.query(CampaignRegistration)\
        .options(
            joinedload(CampaignRegistration.campaign),
            joinedload(CampaignRegistration.slot)
        )\
        .all()

    return [
        {
            "id": str(reg.id),
            "campaign_id": str(reg.campaign_id),
            "user_id": str(reg.user_id),
            "barrio": reg.address.split(",")[-1].strip() if "," in reg.address else "Sin barrio",
            "direccion": reg.address.split(",")[0].strip() if "," in reg.address else reg.address,
            "fecha": reg.campaign.collection_date.strftime("%Y-%m-%d") if reg.campaign else "Sin fecha",
            "hora": reg.slot.slot_time.strftime("%H:%M") if reg.slot else "Sin hora",
            "residuos": [p.get("product_name") for p in json.loads(reg.products)] if reg.products else [],
            "estado": reg.status,
        }
        for reg in registrations
    ]

@router.get("/", response_model=List[CampaignResponse])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Todos los usuarios autenticados pueden ver las campañas activas.
    Incluye horarios disponibles.
    """
    campaigns = db.query(Campaign).filter(Campaign.is_active == True).all()

    result = []
    for campaign in campaigns:
        result.append({
            "id": str(campaign.id),
            "type_of_waste": campaign.type_of_waste,
            "collection_date": campaign.collection_date,
            "zone": campaign.zone,
            "max_capacity_kg": campaign.max_capacity_kg,
            "current_weight_kg": campaign.current_weight_kg,
            "company_id": str(campaign.company_id),
            "is_active": campaign.is_active,
            "created_at": campaign.created_at,
            "slots": [
                {
                    "id": str(slot.id),
                    "campaign_id": str(slot.campaign_id),  # ✅ Incluido
                    "slot_time": slot.slot_time.strftime("%H:%M"),  # ✅ Formateado
                    "is_available": slot.is_available
                }
                for slot in campaign.slots
            ]
        })
    return result


@router.put("/registrations/{registration_id}/reschedule", response_model=CampaignRegistrationResponse)
def reschedule_registration(
    registration_id: str,
    new_slot_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Permite al usuario reprogramar su inscripción a un nuevo horario.
    """
    # Buscar la inscripción
    registration = db.query(CampaignRegistration).filter(
        CampaignRegistration.id == registration_id,
        CampaignRegistration.user_id == current_user.id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada o no autorizada")

    # Buscar el nuevo slot
    new_slot = db.query(CampaignSlot).filter(
        CampaignSlot.id == new_slot_id,
        CampaignSlot.is_available == True
    ).first()
    if not new_slot:
        raise HTTPException(status_code=400, detail="El nuevo horario no está disponible")

    # Buscar la campaña del slot
    campaign = db.query(Campaign).filter(Campaign.id == new_slot.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    # Marcar el nuevo slot como ocupado
    new_slot.is_available = False

    # Marcar el slot antiguo como disponible (si existe)
    old_slot = db.query(CampaignSlot).filter(
        CampaignSlot.id == registration.slot_id
    ).first()
    if old_slot:
        old_slot.is_available = True

    # Actualizar la inscripción
    registration.slot_id = new_slot.id
    registration.status = "REPROGRAMADA"
    db.commit()
    db.refresh(registration)

    return {
        "id": str(registration.id),
        "campaign_id": str(registration.campaign_id),
        "user_id": str(registration.user_id),
        "address": registration.address,
        "estimated_weight_kg": registration.estimated_weight_kg,
        "status": registration.status,
        "notes": registration.notes,
        "created_at": registration.created_at,
        "products": json.loads(registration.products) if registration.products else []
    }


@router.get("/{campaign_id}/slots", response_model=List[CampaignSlotResponse])
def get_campaign_slots(
    campaign_id: str,
    db: Session = Depends(get_db)
):
    slots = db.query(CampaignSlot).filter(
        CampaignSlot.campaign_id == campaign_id
    ).all()

    if not slots:
        raise HTTPException(status_code=404, detail="No se encontraron horarios para esta campaña")

    # ✅ Convertir manualmente para evitar errores de Pydantic
    return [
        {
            "id": str(slot.id),
            "campaign_id": str(slot.campaign_id),
            "slot_time": slot.slot_time.strftime("%H:%M"),  # time → string
            "is_available": slot.is_available
        }
        for slot in slots
    ]

@router.put("/registrations/{registration_id}/cancel", response_model=CampaignRegistrationResponse)
def cancel_registration(
    registration_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Permite al usuario cancelar su inscripción.
    Libera el slot y actualiza el estado.
    """
    registration = db.query(CampaignRegistration).filter(
        CampaignRegistration.id == registration_id,
        CampaignRegistration.user_id == current_user.id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada o no autorizada")

    if registration.status in ["CANCELADA", "COMPLETADA", "FALLIDA"]:
        raise HTTPException(status_code=400, detail="La inscripción ya está cancelada o completada")

    # Liberar el slot
    if registration.slot_id:
        slot = db.query(CampaignSlot).filter(CampaignSlot.id == registration.slot_id).first()
        if slot:
            slot.is_available = True

    # Actualizar estado
    registration.status = "CANCELADA"
    db.commit()
    db.refresh(registration)

    return {
        "id": str(registration.id),
        "campaign_id": str(registration.campaign_id),
        "user_id": str(registration.user_id),
        "address": registration.address,
        "estimated_weight_kg": registration.estimated_weight_kg,
        "status": registration.status,
        "notes": registration.notes,
        "created_at": registration.created_at,
        "products": json.loads(registration.products) if registration.products else [],
        "slot_id": str(registration.slot_id) if registration.slot_id else None,
        "slot_time": (
            registration.slot.slot_time.strftime("%H:%M")
            if registration.slot and registration.slot.slot_time
            else None
        )
    }

@router.get("/registrationsadmin", response_model=List[CampaignRegistrationAdminResponse])
def list_all_registrations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    registrations = db.query(CampaignRegistration)\
        .options(
            joinedload(CampaignRegistration.campaign),
            joinedload(CampaignRegistration.slot)
        )\
        .all()

    result = []
    for reg in registrations:
        # Extraer barrio y dirección
        addr_parts = reg.address.split(",")
        direccion_corta = addr_parts[0].strip() if addr_parts else reg.address
        barrio = addr_parts[-1].strip() if len(addr_parts) > 1 else "Sin barrio"

        result.append({
            "id": str(reg.id),
            "campaign_id": str(reg.campaign_id),
            "user_id": str(reg.user_id),
            "address": reg.address,
            "estimated_weight_kg": reg.estimated_weight_kg,
            "status": reg.status,
            "notes": reg.notes,
            "created_at": reg.created_at,
            "products": json.loads(reg.products) if reg.products else [],
            # Campos adicionales
            "barrio": barrio,
            "direccion_corta": direccion_corta,
            "fecha_recoleccion": reg.campaign.collection_date.strftime("%Y-%m-%d") if reg.campaign else None,
            "hora_recoleccion": reg.slot.slot_time.strftime("%H:%M") if reg.slot else None
        })

    return result