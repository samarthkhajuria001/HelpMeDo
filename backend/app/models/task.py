import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, DateTime, Date, Time, ForeignKey, Enum, Text
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.orm import relationship
from app.database import Base


class Priority(str, PyEnum):
    high = "high"
    medium = "medium"
    low = "low"


class Status(str, PyEnum):
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"


class TimeHorizon(str, PyEnum):
    today = "today"
    week = "week"
    someday = "someday"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False)
    goal_id = Column(CHAR(36), ForeignKey("goals.id"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    agent_notes = Column(Text, nullable=True)
    generated_by_agent = Column(Boolean, default=False)
    status = Column(Enum(Status), default=Status.pending)
    completed_at = Column(DateTime, nullable=True)
    priority = Column(Enum(Priority), default=Priority.medium)
    due_date = Column(Date, nullable=True)
    due_time = Column(Time, nullable=True)
    time_horizon = Column(Enum(TimeHorizon), default=TimeHorizon.today)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="tasks")
    goal = relationship("Goal", back_populates="tasks")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
