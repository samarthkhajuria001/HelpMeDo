from pydantic import BaseModel
from typing import Optional, Any, Literal, Union
from datetime import datetime
from enum import Enum


class Intent(str, Enum):
    MAGIC_CAPTURE = "magic_capture"
    GENERAL_CHAT = "general_chat"
    LIBRARIAN = "librarian"
    REALITY_CHECK = "reality_check"
    SMART_REVIEW = "smart_review"
    STUCK_BREAKER = "stuck_breaker"
    GOAL_AUDIT = "goal_audit"
    SUNDAY_GARDENER = "sunday_gardener"
    DEEP_PLAN = "deep_plan"


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


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    client_date: Optional[str] = None
    history: Optional[list[ChatHistoryItem]] = None


class ChatResponse(BaseModel):
    message: str
    session_id: str
    message_metadata: Optional[dict[str, Any]] = None
    actions: Optional[Union[list[dict[str, Any]], dict[str, Any]]] = None
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
    data: Union[list[ExecuteTaskData], dict[str, Any]]
    session_id: Optional[str] = None


class ExecuteResponse(BaseModel):
    success: bool
    message: str
    created_ids: Optional[list[str]] = None
    errors: Optional[list[str]] = None
