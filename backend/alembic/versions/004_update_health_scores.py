"""Update health_scores table per specification

Adds new component score fields per specification:
- product_adoption_score (15% weight)
- support_health_score (25% weight)
- sla_compliance_score (20% weight)
- financial_health_score (20% weight)
- risk_level enum (low, medium, high, critical)
- notes field

Revision ID: 004
Revises: 003
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create risk_level enum type
    op.execute("CREATE TYPE risklevel AS ENUM ('low', 'medium', 'high', 'critical')")

    # Add new component score columns per specification
    op.add_column('health_scores', sa.Column('product_adoption_score', sa.Integer(), nullable=True))
    op.add_column('health_scores', sa.Column('support_health_score', sa.Integer(), nullable=True))
    op.add_column('health_scores', sa.Column('financial_health_score', sa.Integer(), nullable=True))
    op.add_column('health_scores', sa.Column('sla_compliance_score', sa.Integer(), nullable=True))

    # Add risk_level column with default value
    op.add_column('health_scores', sa.Column(
        'risk_level',
        sa.Enum('low', 'medium', 'high', 'critical', name='risklevel', create_type=False),
        nullable=True
    ))

    # Add notes column
    op.add_column('health_scores', sa.Column('notes', sa.String(), nullable=True))

    # Migrate data: copy old values to new columns
    op.execute("""
        UPDATE health_scores SET
            product_adoption_score = COALESCE(adoption_score, 0),
            support_health_score = COALESCE(support_score, 0),
            financial_health_score = COALESCE(financial_score, 0),
            sla_compliance_score = 100,
            risk_level = CASE
                WHEN overall_score >= 80 THEN 'low'::risklevel
                WHEN overall_score >= 60 THEN 'medium'::risklevel
                WHEN overall_score >= 40 THEN 'high'::risklevel
                ELSE 'critical'::risklevel
            END
    """)

    # Set columns to NOT NULL after data migration
    op.alter_column('health_scores', 'product_adoption_score', nullable=False, server_default='0')
    op.alter_column('health_scores', 'support_health_score', nullable=False, server_default='0')
    op.alter_column('health_scores', 'financial_health_score', nullable=False, server_default='0')
    op.alter_column('health_scores', 'sla_compliance_score', nullable=False, server_default='0')
    op.alter_column('health_scores', 'risk_level', nullable=False, server_default='medium')

    # Make legacy columns nullable (for backward compatibility)
    op.alter_column('health_scores', 'adoption_score', nullable=True)
    op.alter_column('health_scores', 'support_score', nullable=True)
    op.alter_column('health_scores', 'financial_score', nullable=True)


def downgrade() -> None:
    # Drop new columns
    op.drop_column('health_scores', 'notes')
    op.drop_column('health_scores', 'risk_level')
    op.drop_column('health_scores', 'sla_compliance_score')
    op.drop_column('health_scores', 'financial_health_score')
    op.drop_column('health_scores', 'support_health_score')
    op.drop_column('health_scores', 'product_adoption_score')

    # Drop risk_level enum type
    op.execute("DROP TYPE IF EXISTS risklevel")

    # Restore legacy columns to NOT NULL
    op.alter_column('health_scores', 'adoption_score', nullable=False)
    op.alter_column('health_scores', 'support_score', nullable=False)
    op.alter_column('health_scores', 'financial_score', nullable=False)
