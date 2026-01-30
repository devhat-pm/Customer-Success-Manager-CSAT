"""Add announcements table

Revision ID: 010
Revises: 009
Create Date: 2024-01-26 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '010'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE announcementpriority AS ENUM ('normal', 'important')")
    op.execute("CREATE TYPE announcementtargettype AS ENUM ('all_customers', 'specific_customers')")

    # Create announcements table
    op.create_table(
        'announcements',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column(
            'target_type',
            postgresql.ENUM('all_customers', 'specific_customers', name='announcementtargettype', create_type=False),
            nullable=False,
            server_default='all_customers'
        ),
        sa.Column('target_customer_ids', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column(
            'priority',
            postgresql.ENUM('normal', 'important', name='announcementpriority', create_type=False),
            nullable=False,
            server_default='normal'
        ),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_announcements_id', 'announcements', ['id'])
    op.create_index('ix_announcements_start_date', 'announcements', ['start_date'])
    op.create_index('ix_announcements_is_active', 'announcements', ['is_active'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_announcements_is_active', table_name='announcements')
    op.drop_index('ix_announcements_start_date', table_name='announcements')
    op.drop_index('ix_announcements_id', table_name='announcements')

    # Drop table
    op.drop_table('announcements')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS announcementtargettype")
    op.execute("DROP TYPE IF EXISTS announcementpriority")
