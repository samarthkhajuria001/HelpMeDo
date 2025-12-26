import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class GoalColor(str, PyEnum):
    blue = "blue"
    green = "green"
    amber = "amber"
    rose = "rose"
    violet = "violet"
    cyan = "cyan"


class Goal(Base):
    __tablename__ = "goals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(Enum(GoalColor), default=GoalColor.blue)
    archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="goals")
    tasks = relationship("Task", back_populates="goal", cascade="all, delete-orphan")
