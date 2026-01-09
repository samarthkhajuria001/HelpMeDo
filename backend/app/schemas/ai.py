from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    session_id: str
    message_metadata: Optional[dict[str, Any]] = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    message_metadata: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
