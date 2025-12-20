import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, ForeignKey, Enum, Text, DateTime, Boolean
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.orm import relationship
from app.database import Base


class SubtaskStatus(str, PyEnum):
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"


class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(CHAR(36), ForeignKey("tasks.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    agent_notes = Column(Text, default="")
    status = Column(Enum(SubtaskStatus), default=SubtaskStatus.pending)
    order = Column(Integer, default=0)
    generated_by_agent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    task = relationship("Task", back_populates="subtasks")
