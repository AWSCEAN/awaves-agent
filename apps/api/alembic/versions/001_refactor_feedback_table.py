"""Refactor feedback table - merge SavedItemFeedback into Feedback.

Revision ID: 001
Revises:
Create Date: 2025-02-07

Changes:
- Drop old 'feedback' table (general feedback)
- Drop 'saved_item_feedback' table
- Create new 'feedback' table with saved item feedback schema
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Drop old feedback table if exists
    op.execute("DROP TABLE IF EXISTS feedback CASCADE")

    # Drop old saved_item_feedback table if exists
    op.execute("DROP TABLE IF EXISTS saved_item_feedback CASCADE")

    # Create new feedback table
    op.create_table(
        'feedback',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('location_id', sa.String(100), nullable=False),
        sa.Column('surf_timestamp', sa.String(50), nullable=False),
        sa.Column('feedback_result', sa.Boolean(), nullable=True),
        sa.Column('feedback_status', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_feedback_user_id', 'feedback', ['user_id'])
    op.create_index('ix_feedback_location_id', 'feedback', ['location_id'])


def downgrade() -> None:
    """Downgrade database schema."""
    # Drop new feedback table
    op.drop_index('ix_feedback_location_id', table_name='feedback')
    op.drop_index('ix_feedback_user_id', table_name='feedback')
    op.drop_table('feedback')

    # Recreate old feedback table
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('spot_id', sa.String(50), nullable=True),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_feedback_user_id', 'feedback', ['user_id'])
    op.create_index('ix_feedback_spot_id', 'feedback', ['spot_id'])

    # Recreate old saved_item_feedback table
    op.create_table(
        'saved_item_feedback',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('location_id', sa.String(100), nullable=False),
        sa.Column('surf_timestamp', sa.String(50), nullable=False),
        sa.Column('feedback_result', sa.Integer(), nullable=True),
        sa.Column('feedback_status', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_saved_item_feedback_user_id', 'saved_item_feedback', ['user_id'])
    op.create_index('ix_saved_item_feedback_location_id', 'saved_item_feedback', ['location_id'])
