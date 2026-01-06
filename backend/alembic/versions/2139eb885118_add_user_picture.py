"""add user picture

Revision ID: 2139eb885118
Revises: add_pomodoro_001
Create Date: 2026-01-06 16:42:31.047765

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2139eb885118'
down_revision: Union[str, None] = 'add_pomodoro_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add picture column to users table
    op.add_column('users', sa.Column('picture', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'picture')
