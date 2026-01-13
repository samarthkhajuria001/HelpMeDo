import json
from typing import Any
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from app.ai.config import get_llm
from app.ai.graphs.state import DeepPlanState, PlanData, PlanTask, UserConstraints


class ConstraintExtractionOutput(BaseModel):
    current_level: str | None = Field(default=None, description="beginner/intermediate/advanced")
    time_per_day: str | None = Field(default=None, description="15min/30min/1hour/2hours+")
    timeline: str | None = Field(default=None, description="e.g., 2 months, 6 weeks")
    specific_focus: str | None = Field(default=None, description="Specific areas to focus on")
    constraints: str | None = Field(default=None, description="Limitations like budget, schedule")
    still_missing: list[str] = Field(default_factory=list, description="Required fields still missing")
    response: str = Field(description="Response to user - either clarifying question or confirmation")


class PlanTaskSchema(BaseModel):
    title: str
    description: str
    week_range: str = Field(description="e.g., 'Week 1-2', 'Week 3-4'")
    priority: str = Field(description="high/medium/low")
    estimated_pomodoros: int = Field(description="Estimated 25-min sessions needed")


class PlanGenerationOutput(BaseModel):
    goal_title: str
    goal_description: str
    goal_color: str = Field(description="One of: blue, green, amber, rose, violet, cyan")
    duration_weeks: int
    tasks: list[PlanTaskSchema]
    summary: str = Field(description="Brief message explaining the plan to user")


GATHER_INFO_PROMPT = """You are helping a user create a structured plan for their goal.

USER'S GOAL: {goal_intent}

CURRENT KNOWN INFO:
{current_constraints}

USER'S LATEST MESSAGE: {latest_message}

Extract any new information about:
- current_level: Their experience level (beginner/intermediate/advanced)
- time_per_day: How much time they can spend daily (15min/30min/1hour/2hours+)
- timeline: When they want to achieve this (e.g., "2 months", "6 weeks")
- specific_focus: Any specific areas they want to focus on
- constraints: Any limitations (budget, schedule, physical)

REQUIRED for plan generation: current_level AND timeline (at minimum)

If current_level and timeline are known, still_missing should be empty.
If either is unknown, include them in still_missing and ask a natural clarifying question.

Your response should be conversational - either asking for missing info or confirming you have what you need."""


GENERATE_PLAN_PROMPT = """Create a structured learning/achievement plan.

GOAL: {goal_intent}

USER INFO:
- Level: {current_level}
- Time Available: {time_per_day}
- Timeline: {timeline}
- Focus Areas: {specific_focus}
- Constraints: {constraints}

Create a plan with:
1. A clear, motivating goal title
2. A brief goal description (2-3 sentences)
3. A color name (choose from: blue, green, amber, rose, violet, cyan)
4. 6-12 tasks spread across the timeline
5. Each task should:
   - Have a clear, actionable title
   - Include a brief description of what to do
   - Span 1-2 weeks (week_range like "Week 1-2")
   - Have appropriate priority (first tasks high, later tasks medium/low)
   - Estimate pomodoros (25-min sessions) realistically

Make tasks progressive - building skills over time.
Summary should be 1-2 sentences explaining the plan."""


REFINE_PLAN_PROMPT = """Modify this plan based on user feedback.

CURRENT PLAN:
Goal: {goal_title}
Description: {goal_description}

Tasks:
{tasks_formatted}

USER'S FEEDBACK: {feedback}

Apply the requested changes. Common modifications:
- Add a new task (insert at appropriate week)
- Remove a task
- Change timing/duration
- Adjust difficulty
- Rename tasks or goal

Return the complete updated plan with all tasks (modified and unmodified).
Summary should briefly explain what you changed."""


def gather_info(state: DeepPlanState) -> dict[str, Any]:
    """Extract constraints from user message, ask for missing info."""
    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else None
    latest_message = ""
    if last_msg:
        latest_message = getattr(last_msg, "content", None) or (last_msg.get("content", "") if hasattr(last_msg, "get") else "")

    goal_intent = state.get("goal_intent", "") or latest_message
    current_constraints = state.get("user_constraints") or {}

    prompt = ChatPromptTemplate.from_template(GATHER_INFO_PROMPT)
    llm = get_llm(model="gpt-4o-mini", temperature=0.3).with_structured_output(ConstraintExtractionOutput)

    result = llm.invoke(prompt.format(
        goal_intent=goal_intent,
        current_constraints=json.dumps(current_constraints, indent=2) if current_constraints else "None yet",
        latest_message=latest_message
    ))

    new_constraints: UserConstraints = {
        "current_level": result.current_level or current_constraints.get("current_level"),
        "time_per_day": result.time_per_day or current_constraints.get("time_per_day"),
        "timeline": result.timeline or current_constraints.get("timeline"),
        "specific_focus": result.specific_focus or current_constraints.get("specific_focus"),
        "constraints": result.constraints or current_constraints.get("constraints"),
    }

    needs_info = result.still_missing

    if not needs_info:
        return {
            "goal_intent": goal_intent,
            "user_constraints": new_constraints,
            "needs_info": [],
            "phase": "generating",
            "iteration_count": state.get("iteration_count", 0),
        }
    else:
        return {
            "goal_intent": goal_intent,
            "user_constraints": new_constraints,
            "needs_info": needs_info,
            "phase": "gathering",
            "final_message": result.response,
            "messages": [{"role": "assistant", "content": result.response}],
            "iteration_count": state.get("iteration_count", 0),
        }


def generate_plan(state: DeepPlanState) -> dict[str, Any]:
    """Generate a structured plan based on gathered constraints."""
    goal_intent = state.get("goal_intent", "")
    constraints = state.get("user_constraints") or {}

    prompt = ChatPromptTemplate.from_template(GENERATE_PLAN_PROMPT)
    llm = get_llm(model="gpt-4o", temperature=0.4).with_structured_output(PlanGenerationOutput)

    result = llm.invoke(prompt.format(
        goal_intent=goal_intent,
        current_level=constraints.get("current_level", "not specified"),
        time_per_day=constraints.get("time_per_day", "30 minutes"),
        timeline=constraints.get("timeline", "2 months"),
        specific_focus=constraints.get("specific_focus", "general"),
        constraints=constraints.get("constraints", "none")
    ))

    tasks: list[PlanTask] = []
    for t in result.tasks:
        tasks.append({
            "title": t.title,
            "description": t.description,
            "week_range": t.week_range,
            "priority": t.priority,
            "estimated_pomodoros": t.estimated_pomodoros,
        })

    plan_data: PlanData = {
        "goal_title": result.goal_title,
        "goal_description": result.goal_description,
        "goal_color": result.goal_color,
        "duration_weeks": result.duration_weeks,
        "tasks": tasks,
    }

    preview_message = format_plan_preview(plan_data, result.summary)

    return {
        "plan_data": plan_data,
        "phase": "refining",
        "final_message": preview_message,
        "messages": [{"role": "assistant", "content": preview_message}],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }


def refine_plan(state: DeepPlanState) -> dict[str, Any]:
    """Modify the plan based on user feedback."""
    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else None
    latest_message = ""
    if last_msg:
        latest_message = getattr(last_msg, "content", None) or (last_msg.get("content", "") if hasattr(last_msg, "get") else "")

    current_plan = state.get("plan_data")

    if not current_plan:
        return {
            "final_message": "No plan to refine. Let's start over - what would you like to plan?",
            "phase": "gathering",
        }

    tasks_formatted = "\n".join(
        f"- {t['title']} ({t['week_range']}): {t['description']}"
        for t in current_plan.get("tasks", [])
    )

    prompt = ChatPromptTemplate.from_template(REFINE_PLAN_PROMPT)
    llm = get_llm(model="gpt-4o", temperature=0.3).with_structured_output(PlanGenerationOutput)

    result = llm.invoke(prompt.format(
        goal_title=current_plan.get("goal_title", ""),
        goal_description=current_plan.get("goal_description", ""),
        tasks_formatted=tasks_formatted,
        feedback=latest_message
    ))

    tasks: list[PlanTask] = []
    for t in result.tasks:
        tasks.append({
            "title": t.title,
            "description": t.description,
            "week_range": t.week_range,
            "priority": t.priority,
            "estimated_pomodoros": t.estimated_pomodoros,
        })

    updated_plan: PlanData = {
        "goal_title": result.goal_title,
        "goal_description": result.goal_description,
        "goal_color": result.goal_color,
        "duration_weeks": result.duration_weeks,
        "tasks": tasks,
    }

    preview_message = format_plan_preview(updated_plan, result.summary)

    return {
        "plan_data": updated_plan,
        "final_message": preview_message,
        "messages": [{"role": "assistant", "content": preview_message}],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }


def prepare_final(state: DeepPlanState) -> dict[str, Any]:
    """Mark plan as ready for creation."""
    return {
        "phase": "ready",
        "final_message": "Your plan is ready! Click 'Create Plan' to add this goal and all tasks to your list.",
        "messages": [{"role": "assistant", "content": "Your plan is ready! Click 'Create Plan' to add this goal and all tasks to your list."}],
    }


def format_plan_preview(plan: PlanData, summary: str) -> str:
    """Format plan data for display in chat."""
    lines = [summary, ""]
    lines.append(f"**{plan['goal_title']}**")
    lines.append(f"{plan['goal_description']}")
    lines.append(f"Duration: {plan['duration_weeks']} weeks")
    lines.append("")
    lines.append("**Tasks:**")

    for i, task in enumerate(plan.get("tasks", []), 1):
        priority_badge = ""
        if task["priority"] == "high":
            priority_badge = " [HIGH]"
        lines.append(f"{i}. {task['title']} ({task['week_range']}){priority_badge}")

    lines.append("")
    lines.append("Say 'create it' to save, or tell me what to change.")

    return "\n".join(lines)
