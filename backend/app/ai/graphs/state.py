from typing import TypedDict, Annotated, Literal, Optional
from langgraph.graph.message import add_messages


class PlanTask(TypedDict):
    title: str
    description: str
    week_range: str
    priority: Literal["high", "medium", "low"]
    estimated_pomodoros: int


class PlanData(TypedDict):
    goal_title: str
    goal_description: str
    goal_color: str
    duration_weeks: int
    tasks: list[PlanTask]


class UserConstraints(TypedDict):
    current_level: Optional[str]
    time_per_day: Optional[str]
    timeline: Optional[str]
    specific_focus: Optional[str]
    constraints: Optional[str]


class DeepPlanState(TypedDict):
    messages: Annotated[list[dict], add_messages]
    user_id: str
    session_id: str
    goal_intent: str
    user_constraints: UserConstraints
    plan_data: Optional[PlanData]
    phase: Literal["gathering", "generating", "refining", "ready"]
    iteration_count: int
    needs_info: list[str]
    final_message: Optional[str]
