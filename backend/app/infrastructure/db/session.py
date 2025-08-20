# backend/app/infrastructure/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .base import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Emperor0721@localhost:5432/waste")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Crear tablas (solo para desarrollo inicial, luego usa migraciones)
def init_db():
    Base.metadata.create_all(bind=engine)