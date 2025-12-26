import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    google_id = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    goals = relationship("Goal", back_populates="user")
    tasks = relationship("Task", back_populates="user")
