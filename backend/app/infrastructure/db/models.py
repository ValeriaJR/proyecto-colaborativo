# backend/app/infrastructure/db/models.py

from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, configure_mappers
from datetime import datetime
import uuid
from .base import Base
from enum import Enum as PyEnum


# === Definición de Enums ===

class UserRole(PyEnum):
    ADMIN = "ADMIN"
    USER = "USER"
    COLLECTOR = "COLLECTOR"
    COMPANY = "COMPANY"


class RequestStatus(PyEnum):
    CREADA = "CREADA"
    ASIGNADA = "ASIGNADA"
    EN_CAMINO = "EN_CAMINO"
    EN_SITIO = "EN_SITIO"
    COMPLETADA = "COMPLETADA"
    FALLIDA = "FALLIDA"
    CANCELADA = "CANCELADA"
    REPROGRAMADA = "REPROGRAMADA"


# === Definición de Tablas (Modelos ORM) ===

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    address = Column(String(200))
    phone = Column(String(20))
    barrio = Column(String(50))
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    points = relationship("Points", back_populates="user", cascade="all, delete-orphan")
    company = relationship("Company", back_populates="collectors")
    registrations = relationship("CampaignRegistration", back_populates="user", overlaps="campaign_registrations")
    campaign_registrations = relationship("CampaignRegistration", back_populates="user", cascade="all, delete-orphan")

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(String(300))
    specialization = Column(String(50))
    contact_email = Column(String(150))
    contact_phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    collectors = relationship("User", back_populates="company", foreign_keys=[User.company_id])
    assignments = relationship("Assignment", back_populates="company")
    campaigns = relationship("Campaign", back_populates="company")  # ✅ Relación explícita aquí


# --- Campaña de recolección ---
class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type_of_waste = Column(String(50), nullable=False)
    collection_date = Column(DateTime, nullable=False)
    zone = Column(String(100), nullable=False)
    max_capacity_kg = Column(Integer, nullable=True)
    current_weight_kg = Column(Integer, default=0)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    slots = relationship("CampaignSlot", back_populates="campaign", cascade="all, delete-orphan")

    # Relaciones
    company = relationship("Company", back_populates="campaigns")
    registrations = relationship("CampaignRegistration", back_populates="campaign")


# --- Inscripción del usuario a una campaña ---

class CampaignRegistration(Base):
    __tablename__ = "campaign_registrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    address = Column(String(200), nullable=False)
    estimated_weight_kg = Column(Integer, nullable=False)
    status = Column(SQLEnum(RequestStatus, create_type=True), default=RequestStatus.CREADA,nullable=False)
    notes = Column(String(300))
    created_at = Column(DateTime, default=datetime.utcnow)
    slot_id = Column(UUID(as_uuid=True), ForeignKey("campaign_slots.id"), nullable=True)
    products = Column(Text, nullable=True)

    # ✅ Añade esta línea
    slot = relationship("CampaignSlot", back_populates="registration")

    # Relaciones existentes
    campaign = relationship("Campaign", back_populates="registrations")
    user = relationship("User", back_populates="campaign_registrations")
    assignment = relationship("Assignment", uselist=False, back_populates="registration")

class CampaignSlot(Base):
    __tablename__ = "campaign_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    slot_time = Column(Time, nullable=False)  # Hora del día (09:00, 10:30, etc.)
    is_available = Column(Boolean, default=True)

    campaign = relationship("Campaign", back_populates="slots")
    registration = relationship("CampaignRegistration", back_populates="slot", uselist=False)


# --- Asignación de recolector ---
class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("campaign_registrations.id"), nullable=False)
    collector_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    vehicle_plate = Column(String(20))
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.ASIGNADA, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    registration = relationship("CampaignRegistration", back_populates="assignment")
    collector = relationship("User")
    company = relationship("Company", back_populates="assignments")


# --- Sistema de puntos ---
class Points(Base):
    __tablename__ = "points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    points_earned = Column(Integer, default=0)
    points_redeemed = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

    # Relación
    user = relationship("User", back_populates="points")


# ✅ Fuerza la configuración de los mapeadores al final
try:
    configure_mappers()
except Exception as e:
    print(f"Advertencia: Error al configurar mapeadores: {e}")
