"""Add customer portal tables (customer_users and customer_user_invitations)

Revision ID: 007
Revises: 006
Create Date: 2024-01-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename metadata column in activity_logs (reserved SQLAlchemy attribute name) - if exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_logs' AND column_name='metadata') THEN
                ALTER TABLE activity_logs RENAME COLUMN metadata TO activity_metadata;
            END IF;
        END $$;
    """)

    # Add portal_enabled column to customers table - if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='portal_enabled') THEN
                ALTER TABLE customers ADD COLUMN portal_enabled BOOLEAN NOT NULL DEFAULT false;
            END IF;
        END $$;
    """)

    # Create customer_users table
    op.create_table(
        'customer_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('job_title', sa.String(100), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('is_primary_contact', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customer_users_id'), 'customer_users', ['id'], unique=False)
    op.create_index(op.f('ix_customer_users_customer_id'), 'customer_users', ['customer_id'], unique=False)
    op.create_index(op.f('ix_customer_users_email'), 'customer_users', ['email'], unique=True)

    # Create customer_user_invitations table
    op.create_table(
        'customer_user_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('invitation_token', sa.String(64), nullable=False),
        sa.Column('invited_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customer_user_invitations_id'), 'customer_user_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_customer_user_invitations_customer_id'), 'customer_user_invitations', ['customer_id'], unique=False)
    op.create_index(op.f('ix_customer_user_invitations_email'), 'customer_user_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_customer_user_invitations_invitation_token'), 'customer_user_invitations', ['invitation_token'], unique=True)
    op.create_index(op.f('ix_customer_user_invitations_invited_by_id'), 'customer_user_invitations', ['invited_by_id'], unique=False)


def downgrade() -> None:
    # Drop customer_user_invitations table and indexes
    op.drop_index(op.f('ix_customer_user_invitations_invited_by_id'), table_name='customer_user_invitations')
    op.drop_index(op.f('ix_customer_user_invitations_invitation_token'), table_name='customer_user_invitations')
    op.drop_index(op.f('ix_customer_user_invitations_email'), table_name='customer_user_invitations')
    op.drop_index(op.f('ix_customer_user_invitations_customer_id'), table_name='customer_user_invitations')
    op.drop_index(op.f('ix_customer_user_invitations_id'), table_name='customer_user_invitations')
    op.drop_table('customer_user_invitations')

    # Drop customer_users table and indexes
    op.drop_index(op.f('ix_customer_users_email'), table_name='customer_users')
    op.drop_index(op.f('ix_customer_users_customer_id'), table_name='customer_users')
    op.drop_index(op.f('ix_customer_users_id'), table_name='customer_users')
    op.drop_table('customer_users')

    # Remove portal_enabled column from customers table
    op.drop_column('customers', 'portal_enabled')

    # Revert metadata column rename in activity_logs
    op.alter_column('activity_logs', 'activity_metadata', new_column_name='metadata')
