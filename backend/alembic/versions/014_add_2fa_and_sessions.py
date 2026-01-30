"""Add 2FA and user sessions

Revision ID: 014
Revises: 013
Create Date: 2024-01-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '014'
down_revision: Union[str, None] = '013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 2FA columns to users table
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255)
    """)

    # Create user_sessions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_jti VARCHAR(255) NOT NULL UNIQUE,
            device_info VARCHAR(500),
            ip_address VARCHAR(45),
            location VARCHAR(255),
            user_agent TEXT,
            last_active TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            is_revoked VARCHAR(1) NOT NULL DEFAULT 'N'
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_token_jti ON user_sessions (token_jti)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_sessions")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS two_factor_secret")
