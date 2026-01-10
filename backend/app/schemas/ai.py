from pydantic import BaseModel
from typing import Optional, Any, Literal
from datetime import datetime
from enum import Enum


class Intent(str, Enum):
    MAGIC_CAPTURE = "magic_capture"
    GENERAL_CHAT = "general_chat"


class IntentClassification(BaseModel):
    intent: Intent
    confidence: float
    reasoning: str


class ParsedTask(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Literal["high", "medium", "low"] = "medium"
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    goal_name: Optional[str] = None


class MagicCaptureOutput(BaseModel):
    tasks: list[ParsedTask]
    message: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    client_date: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    session_id: str
    message_metadata: Optional[dict[str, Any]] = None
    actions: Optional[list[dict[str, Any]]] = None
    action_type: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    message_metadata: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ExecuteTaskData(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Literal["high", "medium", "low"] = "medium"
    time_horizon: Literal["today", "week", "someday"] = "today"
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    goal_id: Optional[str] = None


class ExecuteRequest(BaseModel):
    action_type: str
    data: list[ExecuteTaskData]
    session_id: Optional[str] = None


class ExecuteResponse(BaseModel):
    success: bool
    message: str
    created_ids: Optional[list[str]] = None
    errors: Optional[list[str]] = None
