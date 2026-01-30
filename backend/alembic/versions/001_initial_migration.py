"""Initial migration - create all tables

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE usersrole AS ENUM ('admin', 'manager', 'viewer')")
    op.execute("CREATE TYPE customerstatus AS ENUM ('active', 'at_risk', 'churned', 'onboarding')")
    op.execute("CREATE TYPE productname AS ENUM ('MonetX', 'SupportX', 'GreenX')")
    op.execute("CREATE TYPE environment AS ENUM ('cloud', 'on_premise', 'hybrid')")
    op.execute("CREATE TYPE scoretrend AS ENUM ('improving', 'stable', 'declining')")
    op.execute("CREATE TYPE surveytype AS ENUM ('post_ticket', 'quarterly', 'nps', 'onboarding')")
    op.execute("CREATE TYPE interactiontype AS ENUM ('support_ticket', 'meeting', 'email', 'call', 'escalation', 'training')")
    op.execute("CREATE TYPE sentiment AS ENUM ('positive', 'neutral', 'negative')")
    op.execute("CREATE TYPE alerttype AS ENUM ('health_drop', 'contract_expiry', 'low_csat', 'escalation', 'inactivity')")
    op.execute("CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical')")
    op.execute("CREATE TYPE reporttype AS ENUM ('health_summary', 'csat_analysis', 'customer_overview', 'executive_summary')")
    op.execute("CREATE TYPE frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly')")
    op.execute("CREATE TYPE reportstatus AS ENUM ('completed', 'failed')")

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', postgresql.ENUM('admin', 'manager', 'viewer', name='usersrole', create_type=False), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create customers table
    op.create_table(
        'customers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('industry', sa.String(100), nullable=False),
        sa.Column('contact_name', sa.String(255), nullable=False),
        sa.Column('contact_email', sa.String(255), nullable=False),
        sa.Column('contact_phone', sa.String(50), nullable=False),
        sa.Column('contract_start_date', sa.Date(), nullable=False),
        sa.Column('contract_end_date', sa.Date(), nullable=False),
        sa.Column('contract_value', sa.Numeric(15, 2), nullable=False),
        sa.Column('account_manager', sa.String(255), nullable=False),
        sa.Column('status', postgresql.ENUM('active', 'at_risk', 'churned', 'onboarding', name='customerstatus', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customers_id'), 'customers', ['id'], unique=False)
    op.create_index(op.f('ix_customers_company_name'), 'customers', ['company_name'], unique=True)

    # Create product_deployments table
    op.create_table(
        'product_deployments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_name', postgresql.ENUM('MonetX', 'SupportX', 'GreenX', name='productname', create_type=False), nullable=False),
        sa.Column('deployment_date', sa.Date(), nullable=False),
        sa.Column('version', sa.String(50), nullable=False),
        sa.Column('environment', postgresql.ENUM('cloud', 'on_premise', 'hybrid', name='environment', create_type=False), nullable=False),
        sa.Column('license_type', sa.String(100), nullable=False),
        sa.Column('license_expiry', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_deployments_id'), 'product_deployments', ['id'], unique=False)
    op.create_index(op.f('ix_product_deployments_customer_id'), 'product_deployments', ['customer_id'], unique=False)

    # Create health_scores table
    op.create_table(
        'health_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_deployment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('overall_score', sa.Integer(), nullable=False),
        sa.Column('engagement_score', sa.Integer(), nullable=False),
        sa.Column('adoption_score', sa.Integer(), nullable=False),
        sa.Column('support_score', sa.Integer(), nullable=False),
        sa.Column('financial_score', sa.Integer(), nullable=False),
        sa.Column('score_trend', postgresql.ENUM('improving', 'stable', 'declining', name='scoretrend', create_type=False), nullable=False),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.Column('factors', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_deployment_id'], ['product_deployments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_health_scores_id'), 'health_scores', ['id'], unique=False)
    op.create_index(op.f('ix_health_scores_customer_id'), 'health_scores', ['customer_id'], unique=False)
    op.create_index(op.f('ix_health_scores_product_deployment_id'), 'health_scores', ['product_deployment_id'], unique=False)

    # Create csat_surveys table
    op.create_table(
        'csat_surveys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_deployment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('survey_type', postgresql.ENUM('post_ticket', 'quarterly', 'nps', 'onboarding', name='surveytype', create_type=False), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('feedback_text', sa.Text(), nullable=True),
        sa.Column('submitted_by_name', sa.String(255), nullable=False),
        sa.Column('submitted_by_email', sa.String(255), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.Column('ticket_reference', sa.String(100), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_deployment_id'], ['product_deployments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_csat_surveys_id'), 'csat_surveys', ['id'], unique=False)
    op.create_index(op.f('ix_csat_surveys_customer_id'), 'csat_surveys', ['customer_id'], unique=False)
    op.create_index(op.f('ix_csat_surveys_product_deployment_id'), 'csat_surveys', ['product_deployment_id'], unique=False)

    # Create customer_interactions table
    op.create_table(
        'customer_interactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('interaction_type', postgresql.ENUM('support_ticket', 'meeting', 'email', 'call', 'escalation', 'training', name='interactiontype', create_type=False), nullable=False),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('sentiment', postgresql.ENUM('positive', 'neutral', 'negative', name='sentiment', create_type=False), nullable=False),
        sa.Column('performed_by', sa.String(255), nullable=False),
        sa.Column('interaction_date', sa.DateTime(), nullable=False),
        sa.Column('follow_up_required', sa.Boolean(), nullable=False, default=False),
        sa.Column('follow_up_date', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customer_interactions_id'), 'customer_interactions', ['id'], unique=False)
    op.create_index(op.f('ix_customer_interactions_customer_id'), 'customer_interactions', ['customer_id'], unique=False)

    # Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('alert_type', postgresql.ENUM('health_drop', 'contract_expiry', 'low_csat', 'escalation', 'inactivity', name='alerttype', create_type=False), nullable=False),
        sa.Column('severity', postgresql.ENUM('low', 'medium', 'high', 'critical', name='severity', create_type=False), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), nullable=False, default=False),
        sa.Column('resolved_by', sa.String(255), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerts_id'), 'alerts', ['id'], unique=False)
    op.create_index(op.f('ix_alerts_customer_id'), 'alerts', ['customer_id'], unique=False)

    # Create scheduled_reports table
    op.create_table(
        'scheduled_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_name', sa.String(255), nullable=False),
        sa.Column('report_type', postgresql.ENUM('health_summary', 'csat_analysis', 'customer_overview', 'executive_summary', name='reporttype', create_type=False), nullable=False),
        sa.Column('frequency', postgresql.ENUM('daily', 'weekly', 'monthly', 'quarterly', name='frequency', create_type=False), nullable=False),
        sa.Column('recipients', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_generated_at', sa.DateTime(), nullable=True),
        sa.Column('next_scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scheduled_reports_id'), 'scheduled_reports', ['id'], unique=False)

    # Create report_history table
    op.create_table(
        'report_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scheduled_report_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('report_type', sa.String(100), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('status', postgresql.ENUM('completed', 'failed', name='reportstatus', create_type=False), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['scheduled_report_id'], ['scheduled_reports.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_report_history_id'), 'report_history', ['id'], unique=False)
    op.create_index(op.f('ix_report_history_scheduled_report_id'), 'report_history', ['scheduled_report_id'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_report_history_scheduled_report_id'), table_name='report_history')
    op.drop_index(op.f('ix_report_history_id'), table_name='report_history')
    op.drop_table('report_history')

    op.drop_index(op.f('ix_scheduled_reports_id'), table_name='scheduled_reports')
    op.drop_table('scheduled_reports')

    op.drop_index(op.f('ix_alerts_customer_id'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_id'), table_name='alerts')
    op.drop_table('alerts')

    op.drop_index(op.f('ix_customer_interactions_customer_id'), table_name='customer_interactions')
    op.drop_index(op.f('ix_customer_interactions_id'), table_name='customer_interactions')
    op.drop_table('customer_interactions')

    op.drop_index(op.f('ix_csat_surveys_product_deployment_id'), table_name='csat_surveys')
    op.drop_index(op.f('ix_csat_surveys_customer_id'), table_name='csat_surveys')
    op.drop_index(op.f('ix_csat_surveys_id'), table_name='csat_surveys')
    op.drop_table('csat_surveys')

    op.drop_index(op.f('ix_health_scores_product_deployment_id'), table_name='health_scores')
    op.drop_index(op.f('ix_health_scores_customer_id'), table_name='health_scores')
    op.drop_index(op.f('ix_health_scores_id'), table_name='health_scores')
    op.drop_table('health_scores')

    op.drop_index(op.f('ix_product_deployments_customer_id'), table_name='product_deployments')
    op.drop_index(op.f('ix_product_deployments_id'), table_name='product_deployments')
    op.drop_table('product_deployments')

    op.drop_index(op.f('ix_customers_company_name'), table_name='customers')
    op.drop_index(op.f('ix_customers_id'), table_name='customers')
    op.drop_table('customers')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS reportstatus")
    op.execute("DROP TYPE IF EXISTS frequency")
    op.execute("DROP TYPE IF EXISTS reporttype")
    op.execute("DROP TYPE IF EXISTS severity")
    op.execute("DROP TYPE IF EXISTS alerttype")
    op.execute("DROP TYPE IF EXISTS sentiment")
    op.execute("DROP TYPE IF EXISTS interactiontype")
    op.execute("DROP TYPE IF EXISTS surveytype")
    op.execute("DROP TYPE IF EXISTS scoretrend")
    op.execute("DROP TYPE IF EXISTS environment")
    op.execute("DROP TYPE IF EXISTS productname")
    op.execute("DROP TYPE IF EXISTS customerstatus")
    op.execute("DROP TYPE IF EXISTS usersrole")
