"""Change feedback.user_id FK from CASCADE to SET NULL.

Retain feedback records when a user is deleted,
instead of automatically removing them.

Revision ID: 002
Revises: 001
Create Date: 2026-02-26
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Constraint name used in the database.
# Adjust if the existing constraint has a different name.
FK_NAME = "feedback_user_id_fkey"


def upgrade() -> None:
    """Drop CASCADE FK and add SET NULL FK; make user_id nullable."""
    # 1. Make user_id nullable
    op.alter_column("feedback", "user_id", nullable=True)

    # 2. Drop the existing CASCADE foreign key (if it exists)
    op.execute(
        f"ALTER TABLE feedback DROP CONSTRAINT IF EXISTS {FK_NAME}"
    )

    # 3. Add new FK with SET NULL
    op.execute(
        f"""
        ALTER TABLE feedback
        ADD CONSTRAINT {FK_NAME}
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
        """
    )


def downgrade() -> None:
    """Revert to CASCADE FK; make user_id NOT NULL."""
    # 1. Drop SET NULL FK
    op.execute(
        f"ALTER TABLE feedback DROP CONSTRAINT IF EXISTS {FK_NAME}"
    )

    # 2. Restore CASCADE FK
    op.execute(
        f"""
        ALTER TABLE feedback
        ADD CONSTRAINT {FK_NAME}
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        """
    )

    # 3. Make user_id NOT NULL again (only safe if no NULLs exist)
    op.alter_column("feedback", "user_id", nullable=False)
