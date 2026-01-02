"""add pomodoro support

Revision ID: add_pomodoro_001
Revises: b59394cfda10
Create Date: 2025-01-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_pomodoro_001'
down_revision: Union[str, None] = 'b59394cfda10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add pomodoro columns to tasks table
    op.add_column('tasks', sa.Column('estimated_pomodoros', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('actual_pomodoros', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('tasks', sa.Column('first_focused_at', sa.DateTime(), nullable=True))

    # Add settings column to users table
    op.add_column('users', sa.Column('settings', sa.JSON(), nullable=False, server_default='{}'))

    # Create focus_sessions table
    op.create_table('focus_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('task_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('planned_seconds', sa.Integer(), nullable=False, server_default='1500'),
        sa.Column('actual_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('active', 'completed', 'abandoned', name='sessionstatus'), nullable=False, server_default='active'),
        sa.Column('pause_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_pause_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('pauses', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for focus_sessions
    op.create_index('idx_focus_sessions_task', 'focus_sessions', ['task_id'])
    op.create_index('idx_focus_sessions_user', 'focus_sessions', ['user_id'])
    op.create_index('idx_focus_sessions_user_date', 'focus_sessions', ['user_id', 'started_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_focus_sessions_user_date', table_name='focus_sessions')
    op.drop_index('idx_focus_sessions_user', table_name='focus_sessions')
    op.drop_index('idx_focus_sessions_task', table_name='focus_sessions')

    # Drop focus_sessions table
    op.drop_table('focus_sessions')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS sessionstatus')

    # Remove columns from users
    op.drop_column('users', 'settings')

    # Remove columns from tasks
    op.drop_column('tasks', 'first_focused_at')
    op.drop_column('tasks', 'actual_pomodoros')
    op.drop_column('tasks', 'estimated_pomodoros')
