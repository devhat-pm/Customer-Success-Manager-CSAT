"""Add email queue table

Revision ID: 011
Revises: 010
Create Date: 2024-01-26 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = '010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("""
        CREATE TYPE emailstatus AS ENUM (
            'pending', 'sending', 'sent', 'failed', 'cancelled'
        )
    """)

    op.execute("""
        CREATE TYPE emailtemplatetype AS ENUM (
            'invitation', 'welcome', 'password_reset', 'password_changed',
            'ticket_created_customer', 'ticket_status_update', 'ticket_comment_customer',
            'ticket_created_staff', 'ticket_comment_staff',
            'survey_request', 'survey_reminder', 'ticket_resolution_survey',
            'custom'
        )
    """)

    # Create email_queue table
    op.create_table(
        'email_queue',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'template_type',
            postgresql.ENUM(
                'invitation', 'welcome', 'password_reset', 'password_changed',
                'ticket_created_customer', 'ticket_status_update', 'ticket_comment_customer',
                'ticket_created_staff', 'ticket_comment_staff',
                'survey_request', 'survey_reminder', 'ticket_resolution_survey',
                'custom',
                name='emailtemplatetype',
                create_type=False
            ),
            nullable=False
        ),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('template_data', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('recipient_email', sa.String(255), nullable=False),
        sa.Column('recipient_name', sa.String(255), nullable=True),
        sa.Column(
            'status',
            postgresql.ENUM(
                'pending', 'sending', 'sent', 'failed', 'cancelled',
                name='emailstatus',
                create_type=False
            ),
            nullable=False,
            server_default='pending'
        ),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_email_queue_id', 'email_queue', ['id'])
    op.create_index('ix_email_queue_status', 'email_queue', ['status'])
    op.create_index('ix_email_queue_recipient_email', 'email_queue', ['recipient_email'])
    op.create_index('ix_email_queue_reference_id', 'email_queue', ['reference_id'])
    op.create_index('ix_email_queue_scheduled_at', 'email_queue', ['scheduled_at'])
    op.create_index(
        'ix_email_queue_pending_scheduled',
        'email_queue',
        ['status', 'scheduled_at'],
        postgresql_where=sa.text("status = 'pending'")
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_email_queue_pending_scheduled', table_name='email_queue')
    op.drop_index('ix_email_queue_scheduled_at', table_name='email_queue')
    op.drop_index('ix_email_queue_reference_id', table_name='email_queue')
    op.drop_index('ix_email_queue_recipient_email', table_name='email_queue')
    op.drop_index('ix_email_queue_status', table_name='email_queue')
    op.drop_index('ix_email_queue_id', table_name='email_queue')

    # Drop table
    op.drop_table('email_queue')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS emailtemplatetype")
    op.execute("DROP TYPE IF EXISTS emailstatus")
