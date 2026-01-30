"""Add reset_token columns to users table

Revision ID: 012
Revises: 011
Create Date: 2024-01-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '012'
down_revision: Union[str, None] = '011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add reset_token columns to users table for admin password reset
    op.add_column('users', sa.Column('reset_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires', sa.DateTime(), nullable=True))

    # Add admin_password_reset to emailtemplatetype enum
    op.execute("ALTER TYPE emailtemplatetype ADD VALUE IF NOT EXISTS 'admin_password_reset'")


def downgrade() -> None:
    op.drop_column('users', 'reset_token_expires')
    op.drop_column('users', 'reset_token')
    # Note: PostgreSQL does not support removing enum values easily
