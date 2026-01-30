"""Add settings tables

Revision ID: 013
Revises: 012
Create Date: 2024-01-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '013'
down_revision: Union[str, None] = '012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types if they don't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE settingcategory AS ENUM (
                'alerts', 'reports', 'notifications', 'integrations', 'system'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE integrationstatus AS ENUM (
                'available', 'connected', 'error', 'coming_soon'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Create app_settings table using raw SQL to avoid SQLAlchemy re-creating enums
    op.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            id UUID PRIMARY KEY,
            category settingcategory NOT NULL,
            key VARCHAR(100) NOT NULL,
            value JSONB NOT NULL DEFAULT '{}',
            description TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_app_settings_category_key UNIQUE (category, key)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_app_settings_category ON app_settings (category)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_app_settings_key ON app_settings (key)")

    # Create integrations table using raw SQL
    op.execute("""
        CREATE TABLE IF NOT EXISTS integrations (
            id UUID PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            display_name VARCHAR(100) NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL,
            icon VARCHAR(50),
            status integrationstatus NOT NULL DEFAULT 'available',
            is_enabled BOOLEAN NOT NULL DEFAULT false,
            config JSONB NOT NULL DEFAULT '{}',
            last_sync_at TIMESTAMP,
            error_message TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)

    # Create system_incidents table using raw SQL
    op.execute("""
        CREATE TABLE IF NOT EXISTS system_incidents (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL,
            severity VARCHAR(50) NOT NULL DEFAULT 'minor',
            affected_services JSONB NOT NULL DEFAULT '[]',
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            resolved_at TIMESTAMP,
            scheduled_for TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS system_incidents')
    op.execute('DROP TABLE IF EXISTS integrations')
    op.execute('DROP TABLE IF EXISTS app_settings')
    op.execute('DROP TYPE IF EXISTS settingcategory')
    op.execute('DROP TYPE IF EXISTS integrationstatus')
