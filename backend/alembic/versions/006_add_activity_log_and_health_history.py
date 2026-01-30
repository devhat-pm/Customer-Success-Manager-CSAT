"""Add activity_logs and health_score_history tables

Creates:
- activity_logs: For tracking customer activities (meetings, calls, emails, etc.)
- health_score_history: For tracking health score changes over time

Revision ID: 006
Revises: 005
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create activity_type enum
    op.execute("""
        CREATE TYPE activitytype AS ENUM (
            'meeting', 'call', 'email', 'note', 'escalation',
            'review', 'task', 'health_check', 'contract_update', 'support_ticket'
        )
    """)

    # Create activity_logs table
    op.create_table(
        'activity_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('activity_type', sa.Enum(
            'meeting', 'call', 'email', 'note', 'escalation',
            'review', 'task', 'health_check', 'contract_update', 'support_ticket',
            name='activitytype', create_type=False
        ), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
        sa.Column('logged_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes for activity_logs
    op.create_index('ix_activity_logs_id', 'activity_logs', ['id'], unique=False)
    op.create_index('ix_activity_logs_customer_id', 'activity_logs', ['customer_id'], unique=False)
    op.create_index('ix_activity_logs_user_id', 'activity_logs', ['user_id'], unique=False)
    op.create_index('ix_activity_logs_logged_at', 'activity_logs', ['logged_at'], unique=False)

    # Create health_score_history table
    op.create_table(
        'health_score_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('overall_score', sa.Integer(), nullable=False),
        sa.Column('product_adoption_score', sa.Integer(), nullable=True),
        sa.Column('support_health_score', sa.Integer(), nullable=True),
        sa.Column('engagement_score', sa.Integer(), nullable=True),
        sa.Column('financial_health_score', sa.Integer(), nullable=True),
        sa.Column('sla_compliance_score', sa.Integer(), nullable=True),
        sa.Column('risk_level', sa.String(20), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
    )

    # Create indexes for health_score_history
    op.create_index('ix_health_score_history_id', 'health_score_history', ['id'], unique=False)
    op.create_index('ix_health_score_history_customer_id', 'health_score_history', ['customer_id'], unique=False)
    op.create_index('ix_health_score_history_recorded_at', 'health_score_history', ['recorded_at'], unique=False)

    # Migrate existing health_scores to health_score_history
    op.execute("""
        INSERT INTO health_score_history (id, customer_id, overall_score, product_adoption_score,
            support_health_score, engagement_score, financial_health_score, sla_compliance_score,
            risk_level, recorded_at)
        SELECT
            gen_random_uuid(),
            customer_id,
            overall_score,
            COALESCE(product_adoption_score, adoption_score, 0),
            COALESCE(support_health_score, support_score, 0),
            COALESCE(engagement_score, 0),
            COALESCE(financial_health_score, financial_score, 0),
            COALESCE(sla_compliance_score, 100),
            risk_level::text,
            calculated_at
        FROM health_scores
    """)


def downgrade() -> None:
    # Drop health_score_history
    op.drop_index('ix_health_score_history_recorded_at', table_name='health_score_history')
    op.drop_index('ix_health_score_history_customer_id', table_name='health_score_history')
    op.drop_index('ix_health_score_history_id', table_name='health_score_history')
    op.drop_table('health_score_history')

    # Drop activity_logs
    op.drop_index('ix_activity_logs_logged_at', table_name='activity_logs')
    op.drop_index('ix_activity_logs_user_id', table_name='activity_logs')
    op.drop_index('ix_activity_logs_customer_id', table_name='activity_logs')
    op.drop_index('ix_activity_logs_id', table_name='activity_logs')
    op.drop_table('activity_logs')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS activitytype')
