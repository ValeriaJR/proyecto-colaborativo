"""add campaign slots and products to registration

Revision ID: 37533c860c29
Revises: d33c29ba3077
Create Date: 2025-08-17 13:22:58.229254
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = '37533c860c29'
down_revision: Union[str, None] = 'd33c29ba3077'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Fix status type, add slots and products."""
    
    # ✅ 1. Eliminar el DEFAULT temporalmente
    with op.batch_alter_table('campaign_registrations', schema=None) as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.VARCHAR(),
            existing_server_default=sa.text("'CREADA'::character varying"),
            server_default=None  # ❌ Eliminar DEFAULT
        )

    # ✅ 2. Cambiar el tipo de VARCHAR a ENUM, con cláusula USING
    with op.batch_alter_table('campaign_registrations', schema=None) as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.VARCHAR(),
            type_=sa.Enum('CREADA', 'ASIGNADA', 'EN_CAMINO', 'EN_SITIO', 'COMPLETADA', 'FALLIDA', 'CANCELADA', name='requeststatus'),
            existing_nullable=False,
            postgresql_using="status::requeststatus"
        )

    # ✅ 3. (Opcional) Volver a agregar el DEFAULT como ENUM
    # with op.batch_alter_table('campaign_registrations', schema=None) as batch_op:
    #     batch_op.alter_column(
    #         'status',
    #         server_default=sa.text("'CREADA'::requeststatus")
    #     )

    # ✅ 4. Crear tabla campaign_slots
    op.create_table('campaign_slots',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('slot_time', sa.Time(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # ✅ 5. Añadir columna products
    op.add_column('campaign_registrations', sa.Column('products', sa.Text(), nullable=True))

def downgrade() -> None:
    """Downgrade schema."""
    
    # ❌ Eliminar productos
    op.drop_column('campaign_registrations', 'products')
    
    # ❌ Eliminar tabla campaign_slots
    op.drop_table('campaign_slots')
    
    # ❌ Revertir conversión de status
    with op.batch_alter_table('campaign_registrations', schema=None) as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.Enum('CREADA', 'ASIGNADA', 'EN_CAMINO', 'EN_SITIO', 'COMPLETADA', 'FALLIDA', 'CANCELADA', name='requeststatus'),
            type_=sa.VARCHAR(),
            existing_nullable=False,
            existing_server_default=sa.text("'CREADA'::character varying")
        )