"""add ai tables and task columns

Revision ID: add_ai_001
Revises: 2139eb885118
Create Date: 2026-01-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_ai_001'
down_revision: Union[str, None] = '2139eb885118'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create chat_messages table
    op.create_table('chat_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_chat_user_session', 'chat_messages', ['user_id', 'session_id', 'created_at'])

    # Create ai_audit_log table
    op.create_table('ai_audit_log',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('feature', sa.String(length=50), nullable=False),
        sa.Column('intent_detected', sa.String(length=50), nullable=True),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_audit_user_date', 'ai_audit_log', ['user_id', 'created_at'])

    # Create ai_templates table
    op.create_table('ai_templates',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_data', sa.JSON(), nullable=False),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Add columns to tasks table
    op.add_column('tasks', sa.Column('move_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('tasks', sa.Column('source', sa.String(length=50), nullable=False, server_default='manual'))


def downgrade() -> None:
    # Drop task columns
    op.drop_column('tasks', 'source')
    op.drop_column('tasks', 'move_count')

    # Drop ai_templates table
    op.drop_table('ai_templates')

    # Drop ai_audit_log index and table
    op.drop_index('idx_audit_user_date', table_name='ai_audit_log')
    op.drop_table('ai_audit_log')

    # Drop chat_messages index and table
    op.drop_index('idx_chat_user_session', table_name='chat_messages')
    op.drop_table('chat_messages')
