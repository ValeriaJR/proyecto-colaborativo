# backend/app/api/routes/assignments.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.models import Assignment, CampaignRegistration, User, Company, Points, Campaign
from app.schemas.assignment import AssignmentCreate, AssignmentResponse, AssignmentComplete
from app.api.dependencies.auth import get_current_user
from app.infrastructure.db.models import UserRole
import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


router = APIRouter(prefix="/assignments", tags=["Asignaciones"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_assignment(
    assignment_: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.COMPANY]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para asignar recolectores"
        )

    # ✅ Verificar que la inscripción exista
    registration = db.query(CampaignRegistration).filter(
        CampaignRegistration.id == assignment_.registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    # ✅ Verificar que el recolector exista y sea COLLECTOR
    collector = db.query(User).filter(User.id == assignment_.collector_id).first()
    if not collector or collector.role != UserRole.COLLECTOR:
        raise HTTPException(status_code=404, detail="Recolector no válido")

    # ✅ El company_id debe ser el de la empresa del recolector
    if not collector.company_id:
        raise HTTPException(status_code=400, detail="El recolector no tiene una empresa asignada")

    # ✅ Verificar que la empresa del recolector exista
    company = db.query(Company).filter(Company.id == collector.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa del recolector no encontrada")

    # ✅ Verificar que no esté ya asignado
    existing = db.query(Assignment).filter(Assignment.registration_id == assignment_.registration_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya hay un recolector asignado a esta inscripción")

    # ✅ Crear asignación
    db_assignment = Assignment(
        id=str(uuid.uuid4()),
        registration_id=assignment_.registration_id,
        collector_id=assignment_.collector_id,
        company_id=collector.company_id,  # ✅ Empresa del recolector
        vehicle_plate=assignment_.vehicle_plate,
        status="ASIGNADA",
        assigned_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(db_assignment)

    # ✅ Actualizar estado de la inscripción
    registration.status = "ASIGNADA"
    db.commit()
    db.refresh(db_assignment)

    return {
        "message": "Asignación realizada",
        "assignment_id": str(db_assignment.id),
        "registration_id": str(db_assignment.registration_id),
        "collector_id": str(db_assignment.collector_id),
        "company_id": str(db_assignment.company_id)
    }



class BulkAssignmentCreate(BaseModel):
    registration_ids: List[str]
    collector_id: str
    vehicle_plate: Optional[str] = None

@router.post("/bulk", response_model=dict)
def bulk_assign_collector(
    bulk_data: BulkAssignmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Asigna un recolector a múltiples inscripciones.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No autorizado")

    collector = db.query(User).filter(User.id == bulk_data.collector_id).first()
    if not collector or collector.role != UserRole.COLLECTOR:
        raise HTTPException(status_code=404, detail="Recolector no válido")

    success_count = 0
    for reg_id in bulk_data.registration_ids:
        registration = db.query(CampaignRegistration).filter(
            CampaignRegistration.id == reg_id
        ).first()

        if not registration:
            continue  # O puedes querer fallar todo

        existing = db.query(Assignment).filter(Assignment.registration_id == reg_id).first()
        if existing:
            continue  # Ya asignada

        db_assignment = Assignment(
            id=str(uuid.uuid4()),
            registration_id=reg_id,
            collector_id=bulk_data.collector_id,
            company_id=current_user.company_id or current_user.id,
            vehicle_plate=bulk_data.vehicle_plate,
            status="ASIGNADA"
        )
        db.add(db_assignment)
        registration.status = "ASIGNADA"
        success_count += 1

    db.commit()
    return {"message": f"Asignadas {success_count} solicitudes", "assigned": success_count}


@router.patch("/{assignment_id}/complete", response_model=dict)
def complete_assignment(
    assignment_id: str,
    completion_data: AssignmentComplete,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    # ✅ Verificar que la asignación exista
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    # ✅ Verificar que el recolector sea el asignado
    if assignment.collector_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para completar esta asignación")

    # ✅ Verificar que no esté ya completada
    if assignment.status == "COMPLETADA":
        raise HTTPException(status_code=400, detail="La asignación ya está completada")

    # ✅ Actualizar estado
    assignment.status = "COMPLETADA"
    assignment.registration.status = "COMPLETADA"

    # ✅ Asignar puntos al usuario (20 puntos + 1 por kg)
    user_points = db.query(Points).filter(Points.user_id == assignment.registration.user_id).first()
    points_earned = 20 + completion_data.weight_collected_kg

    if user_points:
        user_points.points_earned += points_earned
        user_points.last_updated = datetime.utcnow()
    else:
        user_points = Points(
            id=str(uuid.uuid4()),
            user_id=assignment.registration.user_id,
            points_earned=points_earned,
            points_redeemed=0,
            last_updated=datetime.utcnow()
        )
        db.add(user_points)

    # ✅ Guardar cambios
    db.commit()

    return {
        "message": "Recolección completada, puntos asignados",
        "points_earned": points_earned,
        "assignment_id": str(assignment.id),
        "user_id": str(assignment.registration.user_id)
    }


@router.get("/me", response_model=List[AssignmentResponse])
def get_my_assignments(
    status: Optional[str] = Query(None, description="Filtrar por estado: CREADA, ASIGNADA, COMPLETADA, etc."),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    # ✅ Construir consulta base
    query = db.query(Assignment)\
        .join(CampaignRegistration)\
        .join(Campaign)\
        .filter(Assignment.collector_id == current_user.id)

    # ✅ Aplicar filtro por estado si se proporciona
    if status:
        query = query.filter(Assignment.status == status.upper())

    assignments = query.all()

    # ✅ Serializar respuesta
    result = []
    for assignment in assignments:
        reg = assignment.registration
        campaign = reg.campaign
        user = reg.user

        result.append({
            "id": str(assignment.id),
            "registration_id": str(assignment.registration_id),
            "collector_id": str(assignment.collector_id),
            "company_id": str(assignment.company_id),
            "assigned_at": assignment.assigned_at,
            "vehicle_plate": assignment.vehicle_plate,
            "status": assignment.status,
            "created_at": assignment.created_at,
            # Datos para el frontend
            "user_address": reg.address,
            "user_full_name": user.full_name,
            "campaign_type_of_waste": campaign.type_of_waste,
            "campaign_collection_date": campaign.collection_date,
            "estimated_weight_kg": reg.estimated_weight_kg,
            "campaign_zone": campaign.zone
        })

    return result