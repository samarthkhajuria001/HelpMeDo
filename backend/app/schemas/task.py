from datetime import datetime, date, time
from pydantic import BaseModel, Field
from app.models.task import Priority, Status, TimeHorizon
from app.models.subtask import SubtaskStatus


class SubtaskCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = ""
    order: int = 0


class SubtaskUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    status: SubtaskStatus | None = None
    order: int | None = None


class SubtaskOut(BaseModel):
    id: str
    task_id: str
    title: str
    description: str
    agent_notes: str
    status: SubtaskStatus
    order: int
    generated_by_agent: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: str = ""
    goal_id: str | None = None
    priority: Priority = Priority.medium
    due_date: date | None = None
    due_time: time | None = None
    time_horizon: TimeHorizon = TimeHorizon.today


class TaskUpdate(BaseModel):
    title: str | None = Field(None, max_length=500)
    description: str | None = None
    goal_id: str | None = None
    priority: Priority | None = None
    status: Status | None = None
    due_date: date | None = None
    due_time: time | None = None
    time_horizon: TimeHorizon | None = None


class TaskOut(BaseModel):
    id: str
    user_id: str
    goal_id: str | None
    title: str
    description: str
    agent_notes: str | None
    generated_by_agent: bool
    status: Status
    completed_at: datetime | None
    priority: Priority
    due_date: date | None
    due_time: time | None
    time_horizon: TimeHorizon
    created_at: datetime
    updated_at: datetime
    subtasks: list[SubtaskOut] = []

    model_config = {"from_attributes": True}
