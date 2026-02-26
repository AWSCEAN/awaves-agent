"""Change feedback.surf_timestamp from VARCHAR(50) to TIMESTAMP.

Revision ID: 001
Revises:
Create Date: 2026-02-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert surf_timestamp from VARCHAR(50) to TIMESTAMP."""
    op.execute(
        """
        ALTER TABLE feedback
        ALTER COLUMN surf_timestamp
        TYPE TIMESTAMP
        USING surf_timestamp::timestamp
        """
    )


def downgrade() -> None:
    """Revert surf_timestamp from TIMESTAMP back to VARCHAR(50)."""
    op.execute(
        """
        ALTER TABLE feedback
        ALTER COLUMN surf_timestamp
        TYPE VARCHAR(50)
        USING to_char(surf_timestamp, 'YYYY-MM-DD"T"HH24:MI:SS')
        """
    )
