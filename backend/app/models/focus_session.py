import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class SessionStatus(str, PyEnum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Timing
    started_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    planned_seconds = Column(Integer, nullable=False, default=1500)
    actual_seconds = Column(Integer, nullable=False, default=0)

    # Status
    status = Column(Enum(SessionStatus), nullable=False, default=SessionStatus.active)

    # Pause tracking (denormalized for queries)
    pause_count = Column(Integer, nullable=False, default=0)
    total_pause_seconds = Column(Integer, nullable=False, default=0)

    # Pause details (JSON array)
    # Format: [{"paused_at": "ISO timestamp", "resumed_at": "ISO timestamp or null"}, ...]
    pauses = Column(JSON, nullable=False, default=list)

    # Future extensibility (JSON object)
    metadata_ = Column("metadata", JSON, nullable=False, default=dict)

    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    task = relationship("Task", back_populates="focus_sessions")
    user = relationship("User", back_populates="focus_sessions")
