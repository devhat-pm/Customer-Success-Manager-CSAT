"""Add support_tickets table

Revision ID: 003
Revises: 002
Create Date: 2024-01-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types for support tickets (IF NOT EXISTS for idempotency)
    op.execute("DO $$ BEGIN CREATE TYPE producttype AS ENUM ('MonetX', 'SupportX', 'GreenX'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE ticketpriority AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE ticketstatus AS ENUM ('open', 'in_progress', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    # Create support_tickets table
    op.create_table(
        'support_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ticket_number', sa.String(20), nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('product', postgresql.ENUM('MonetX', 'SupportX', 'GreenX', name='producttype', create_type=False), nullable=False),
        sa.Column('priority', postgresql.ENUM('low', 'medium', 'high', 'critical', name='ticketpriority', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('open', 'in_progress', 'resolved', 'closed', name='ticketstatus', create_type=False), nullable=False),
        sa.Column('sla_breached', sa.Boolean(), nullable=False, default=False),
        sa.Column('resolution_time_hours', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_tickets_id'), 'support_tickets', ['id'], unique=False)
    op.create_index(op.f('ix_support_tickets_customer_id'), 'support_tickets', ['customer_id'], unique=False)
    op.create_index(op.f('ix_support_tickets_ticket_number'), 'support_tickets', ['ticket_number'], unique=True)


def downgrade() -> None:
    # Drop support_tickets table and indexes
    op.drop_index(op.f('ix_support_tickets_ticket_number'), table_name='support_tickets')
    op.drop_index(op.f('ix_support_tickets_customer_id'), table_name='support_tickets')
    op.drop_index(op.f('ix_support_tickets_id'), table_name='support_tickets')
    op.drop_table('support_tickets')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS ticketstatus")
    op.execute("DROP TYPE IF EXISTS ticketpriority")
    op.execute("DROP TYPE IF EXISTS producttype")
