from datetime import datetime
from typing import Any
from pydantic import BaseModel


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None = None
    settings: dict[str, Any] = {}
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    agent_instructions: str | None = None
