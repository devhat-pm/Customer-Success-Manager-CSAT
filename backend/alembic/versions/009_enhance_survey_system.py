"""Enhance survey system with survey requests

Revision ID: 009
Revises: 008
Create Date: 2024-01-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create new enum types
    op.execute("CREATE TYPE submissionvia AS ENUM ('customer_portal', 'email_link', 'manual_entry')")
    op.execute("CREATE TYPE surveyrequeststatus AS ENUM ('pending', 'completed', 'expired', 'cancelled')")

    # Update surveytype enum to add new values (PostgreSQL specific)
    op.execute("ALTER TYPE surveytype ADD VALUE IF NOT EXISTS 'ticket_followup'")
    op.execute("ALTER TYPE surveytype ADD VALUE IF NOT EXISTS 'quarterly_review'")
    op.execute("ALTER TYPE surveytype ADD VALUE IF NOT EXISTS 'general_feedback'")
    op.execute("ALTER TYPE surveytype ADD VALUE IF NOT EXISTS 'product_feedback'")

    # Create survey_requests table
    op.create_table(
        'survey_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_email', sa.String(255), nullable=True),
        sa.Column('target_customer_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('survey_type', postgresql.ENUM('ticket_followup', 'quarterly_review', 'nps', 'general_feedback', 'product_feedback', 'onboarding', 'post_ticket', name='surveytype', create_type=False), nullable=False),
        sa.Column('linked_ticket_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('custom_message', sa.Text(), nullable=True),
        sa.Column('unique_survey_token', sa.String(255), nullable=False),
        sa.Column('sent_by_staff_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'completed', 'expired', 'cancelled', name='surveyrequeststatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('reminder_sent_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('csat_response_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_customer_user_id'], ['customer_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['linked_ticket_id'], ['support_tickets.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sent_by_staff_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['csat_response_id'], ['csat_surveys.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for survey_requests
    op.create_index('ix_survey_requests_id', 'survey_requests', ['id'])
    op.create_index('ix_survey_requests_customer_id', 'survey_requests', ['customer_id'])
    op.create_index('ix_survey_requests_linked_ticket_id', 'survey_requests', ['linked_ticket_id'])
    op.create_index('ix_survey_requests_unique_survey_token', 'survey_requests', ['unique_survey_token'], unique=True)
    op.create_index('ix_survey_requests_status', 'survey_requests', ['status'])

    # Add new columns to csat_surveys table
    op.add_column('csat_surveys', sa.Column(
        'linked_ticket_id',
        postgresql.UUID(as_uuid=True),
        nullable=True
    ))
    op.add_column('csat_surveys', sa.Column(
        'survey_request_id',
        postgresql.UUID(as_uuid=True),
        nullable=True
    ))
    op.add_column('csat_surveys', sa.Column(
        'submitted_by_customer_user_id',
        postgresql.UUID(as_uuid=True),
        nullable=True
    ))
    op.add_column('csat_surveys', sa.Column(
        'submitted_anonymously',
        sa.Boolean(),
        nullable=False,
        server_default='false'
    ))
    op.add_column('csat_surveys', sa.Column(
        'submitted_via',
        postgresql.ENUM('customer_portal', 'email_link', 'manual_entry', name='submissionvia', create_type=False),
        nullable=False,
        server_default='manual_entry'
    ))
    op.add_column('csat_surveys', sa.Column(
        'entered_by_staff_id',
        postgresql.UUID(as_uuid=True),
        nullable=True
    ))

    # Add foreign keys for new columns
    op.create_foreign_key(
        'fk_csat_surveys_linked_ticket',
        'csat_surveys', 'support_tickets',
        ['linked_ticket_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_csat_surveys_survey_request',
        'csat_surveys', 'survey_requests',
        ['survey_request_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_csat_surveys_submitted_by_customer_user',
        'csat_surveys', 'customer_users',
        ['submitted_by_customer_user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_csat_surveys_entered_by_staff',
        'csat_surveys', 'users',
        ['entered_by_staff_id'], ['id'],
        ondelete='SET NULL'
    )

    # Create indexes for new columns
    op.create_index('ix_csat_surveys_linked_ticket_id', 'csat_surveys', ['linked_ticket_id'])
    op.create_index('ix_csat_surveys_survey_request_id', 'csat_surveys', ['survey_request_id'])
    op.create_index('ix_csat_surveys_submitted_by_customer_user_id', 'csat_surveys', ['submitted_by_customer_user_id'])


def downgrade() -> None:
    # Drop indexes from csat_surveys
    op.drop_index('ix_csat_surveys_submitted_by_customer_user_id', table_name='csat_surveys')
    op.drop_index('ix_csat_surveys_survey_request_id', table_name='csat_surveys')
    op.drop_index('ix_csat_surveys_linked_ticket_id', table_name='csat_surveys')

    # Drop foreign keys
    op.drop_constraint('fk_csat_surveys_entered_by_staff', 'csat_surveys', type_='foreignkey')
    op.drop_constraint('fk_csat_surveys_submitted_by_customer_user', 'csat_surveys', type_='foreignkey')
    op.drop_constraint('fk_csat_surveys_survey_request', 'csat_surveys', type_='foreignkey')
    op.drop_constraint('fk_csat_surveys_linked_ticket', 'csat_surveys', type_='foreignkey')

    # Drop columns from csat_surveys
    op.drop_column('csat_surveys', 'entered_by_staff_id')
    op.drop_column('csat_surveys', 'submitted_via')
    op.drop_column('csat_surveys', 'submitted_anonymously')
    op.drop_column('csat_surveys', 'submitted_by_customer_user_id')
    op.drop_column('csat_surveys', 'survey_request_id')
    op.drop_column('csat_surveys', 'linked_ticket_id')

    # Drop survey_requests table indexes
    op.drop_index('ix_survey_requests_status', table_name='survey_requests')
    op.drop_index('ix_survey_requests_unique_survey_token', table_name='survey_requests')
    op.drop_index('ix_survey_requests_linked_ticket_id', table_name='survey_requests')
    op.drop_index('ix_survey_requests_customer_id', table_name='survey_requests')
    op.drop_index('ix_survey_requests_id', table_name='survey_requests')

    # Drop survey_requests table
    op.drop_table('survey_requests')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS surveyrequeststatus")
    op.execute("DROP TYPE IF EXISTS submissionvia")

    # Note: Cannot remove values from PostgreSQL enums easily in downgrade
