"""Update Customer model per specification

- Add deployed_products JSONB column
- Add account_manager_id FK to users table
- Add logo_url column
- Add notes column
- Make several columns nullable for flexibility

Revision ID: 005
Revises: 004
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to customers table
    op.add_column('customers', sa.Column('deployed_products', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('customers', sa.Column('account_manager_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('customers', sa.Column('logo_url', sa.String(500), nullable=True))
    op.add_column('customers', sa.Column('notes', sa.Text(), nullable=True))

    # Set default value for deployed_products
    op.execute("UPDATE customers SET deployed_products = '[]'::jsonb WHERE deployed_products IS NULL")

    # Make deployed_products NOT NULL with default
    op.alter_column('customers', 'deployed_products', nullable=False, server_default='[]')

    # Create foreign key constraint for account_manager_id
    op.create_foreign_key(
        'fk_customers_account_manager_id',
        'customers',
        'users',
        ['account_manager_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Create index on account_manager_id for better query performance
    op.create_index('ix_customers_account_manager_id', 'customers', ['account_manager_id'], unique=False)

    # Make some columns nullable for flexibility (per specification)
    op.alter_column('customers', 'industry', nullable=True)
    op.alter_column('customers', 'contact_name', nullable=True)
    op.alter_column('customers', 'contact_email', nullable=True)
    op.alter_column('customers', 'contact_phone', nullable=True)
    op.alter_column('customers', 'contract_start_date', nullable=True)
    op.alter_column('customers', 'contract_end_date', nullable=True)
    op.alter_column('customers', 'contract_value', nullable=True)
    op.alter_column('customers', 'account_manager', nullable=True)  # Legacy field now optional


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_customers_account_manager_id', table_name='customers')

    # Drop foreign key constraint
    op.drop_constraint('fk_customers_account_manager_id', 'customers', type_='foreignkey')

    # Drop new columns
    op.drop_column('customers', 'notes')
    op.drop_column('customers', 'logo_url')
    op.drop_column('customers', 'account_manager_id')
    op.drop_column('customers', 'deployed_products')

    # Restore NOT NULL constraints (will fail if there's null data)
    op.alter_column('customers', 'industry', nullable=False)
    op.alter_column('customers', 'contact_name', nullable=False)
    op.alter_column('customers', 'contact_email', nullable=False)
    op.alter_column('customers', 'contact_phone', nullable=False)
    op.alter_column('customers', 'contract_start_date', nullable=False)
    op.alter_column('customers', 'contract_end_date', nullable=False)
    op.alter_column('customers', 'contract_value', nullable=False)
    op.alter_column('customers', 'account_manager', nullable=False)
