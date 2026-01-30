"""Enhance ticket system for customer portal

Revision ID: 008
Revises: 007
Create Date: 2024-01-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create creator type enum
    op.execute("CREATE TYPE creatortype AS ENUM ('customer', 'staff')")

    # Add new columns to support_tickets table
    op.add_column('support_tickets', sa.Column(
        'created_by_type',
        postgresql.ENUM('customer', 'staff', name='creatortype', create_type=False),
        nullable=False,
        server_default='staff'
    ))
    op.add_column('support_tickets', sa.Column(
        'created_by_customer_user_id',
        postgresql.UUID(as_uuid=True),
        nullable=True
    ))
    op.add_column('support_tickets', sa.Column(
        'created_by_staff_user_id',
        postgresql.UUID(as_uuid=True),
        nullable=True
    ))
    op.add_column('support_tickets', sa.Column(
        'customer_contact_email',
        sa.String(255),
        nullable=True
    ))
    op.add_column('support_tickets', sa.Column(
        'internal_notes',
        sa.Text(),
        nullable=True
    ))
    op.add_column('support_tickets', sa.Column(
        'customer_visible_notes',
        sa.Text(),
        nullable=True
    ))

    # Add foreign keys
    op.create_foreign_key(
        'fk_support_tickets_created_by_customer_user',
        'support_tickets', 'customer_users',
        ['created_by_customer_user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_support_tickets_created_by_staff_user',
        'support_tickets', 'users',
        ['created_by_staff_user_id'], ['id'],
        ondelete='SET NULL'
    )

    # Create indexes
    op.create_index(
        'ix_support_tickets_created_by_customer_user_id',
        'support_tickets',
        ['created_by_customer_user_id']
    )
    op.create_index(
        'ix_support_tickets_created_by_staff_user_id',
        'support_tickets',
        ['created_by_staff_user_id']
    )

    # Create ticket_comments table
    op.create_table(
        'ticket_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ticket_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('comment_text', sa.Text(), nullable=False),
        sa.Column(
            'commenter_type',
            postgresql.ENUM('customer', 'staff', name='creatortype', create_type=False),
            nullable=False
        ),
        sa.Column('commenter_customer_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('commenter_staff_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_internal', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('attachments', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['commenter_customer_user_id'], ['customer_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['commenter_staff_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for ticket_comments
    op.create_index('ix_ticket_comments_id', 'ticket_comments', ['id'])
    op.create_index('ix_ticket_comments_ticket_id', 'ticket_comments', ['ticket_id'])
    op.create_index('ix_ticket_comments_commenter_customer_user_id', 'ticket_comments', ['commenter_customer_user_id'])
    op.create_index('ix_ticket_comments_commenter_staff_user_id', 'ticket_comments', ['commenter_staff_user_id'])


def downgrade() -> None:
    # Drop ticket_comments table
    op.drop_index('ix_ticket_comments_commenter_staff_user_id', table_name='ticket_comments')
    op.drop_index('ix_ticket_comments_commenter_customer_user_id', table_name='ticket_comments')
    op.drop_index('ix_ticket_comments_ticket_id', table_name='ticket_comments')
    op.drop_index('ix_ticket_comments_id', table_name='ticket_comments')
    op.drop_table('ticket_comments')

    # Drop indexes from support_tickets
    op.drop_index('ix_support_tickets_created_by_staff_user_id', table_name='support_tickets')
    op.drop_index('ix_support_tickets_created_by_customer_user_id', table_name='support_tickets')

    # Drop foreign keys
    op.drop_constraint('fk_support_tickets_created_by_staff_user', 'support_tickets', type_='foreignkey')
    op.drop_constraint('fk_support_tickets_created_by_customer_user', 'support_tickets', type_='foreignkey')

    # Drop columns from support_tickets
    op.drop_column('support_tickets', 'customer_visible_notes')
    op.drop_column('support_tickets', 'internal_notes')
    op.drop_column('support_tickets', 'customer_contact_email')
    op.drop_column('support_tickets', 'created_by_staff_user_id')
    op.drop_column('support_tickets', 'created_by_customer_user_id')
    op.drop_column('support_tickets', 'created_by_type')

    # Drop enum type
    op.execute("DROP TYPE IF EXISTS creatortype")
