# alembic/env.py

from logging.config import fileConfig
from sqlalchemy import create_engine
from alembic import context
import os
import sys

# Añadir el directorio raíz del proyecto al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importar Base y modelos
from app.infrastructure.db.base import Base
from app.infrastructure.db.models import *

# Configuración de logging (opcional)
config = context.config

# Evitar que Alembic intente crear tipos ENUM existentes
def include_object(object, name, type_, reflected, compare_to):
    if type_ == "type" and hasattr(object, "name") and object.name == "requeststatus":
        return False
    return True

# Obtener la URL de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Emperor0721@localhost:5432/waste")

# Crear el motor
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Configurar el entorno de migración
def run_migrations_online():
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=Base.metadata,
            include_object=include_object,
            compare_type=True,
            render_as_batch=True
        )
        with context.begin_transaction():
            context.run_migrations()

# Ejecutar migraciones
run_migrations_online()