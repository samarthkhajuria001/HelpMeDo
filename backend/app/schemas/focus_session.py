from datetime import datetime
from pydantic import BaseModel
from app.models.focus_session import SessionStatus


class PauseEntry(BaseModel):
    """Single pause event within a focus session."""
    paused_at: str
    resumed_at: str | None = None


class FocusSessionStart(BaseModel):
    """Request body to start a new focus session."""
    task_id: str


class FocusSessionOut(BaseModel):
    """Full focus session response."""
    id: str
    task_id: str
    user_id: str
    started_at: datetime
    ended_at: datetime | None
    planned_seconds: int
    actual_seconds: int
    status: SessionStatus
    pause_count: int
    total_pause_seconds: int
    pauses: list[dict]
    metadata: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class FocusSessionActive(BaseModel):
    """Response for active session check - may or may not have a session."""
    session: FocusSessionOut | None


class FocusSessionPauseResponse(BaseModel):
    """Response after pausing a session."""
    session_id: str
    pause_count: int
    paused_at: str


class FocusSessionResumeResponse(BaseModel):
    """Response after resuming a session."""
    session_id: str
    pause_count: int
    total_pause_seconds: int


class FocusSessionCompleteResponse(BaseModel):
    """Response after completing a session."""
    session_id: str
    actual_seconds: int
    task_actual_pomodoros: int


class FocusSessionAbandonResponse(BaseModel):
    """Response after abandoning a session."""
    session_id: str
    actual_seconds: int
