"""Add account_manager and csm roles to usersrole enum

Revision ID: 002
Revises: 001
Create Date: 2024-12-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new enum values to usersrole type
    op.execute("ALTER TYPE usersrole ADD VALUE IF NOT EXISTS 'account_manager'")
    op.execute("ALTER TYPE usersrole ADD VALUE IF NOT EXISTS 'csm'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values directly
    # A full migration would require recreating the type
    pass
