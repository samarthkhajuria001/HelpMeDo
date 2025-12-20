from datetime import datetime
from pydantic import BaseModel, Field
from app.models.goal import GoalColor


class GoalCreate(BaseModel):
    name: str = Field(..., max_length=100)
    color: GoalColor = GoalColor.blue


class GoalUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    color: GoalColor | None = None
    archived: bool | None = None


class GoalOut(BaseModel):
    id: str
    user_id: str
    name: str
    color: GoalColor
    archived: bool
    created_at: datetime

    model_config = {"from_attributes": True}
