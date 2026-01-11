from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.ai.config import get_llm
from app.ai.context import (
    get_user_goals,
    get_completed_in_range,
    get_stuck_tasks
)


SMART_REVIEW_PROMPT = """You are Lufy generating a weekly progress review.

CURRENT WEEK: {week_start} to {week_end}

THIS WEEK'S COMPLETIONS ({this_week_count} tasks):
{this_week_tasks}

STATS:
- Week-over-week: {change:+d} tasks ({change_percent})
- By priority: {high_count} high, {medium_count} medium, {low_count} low
- Top goal: {top_goal}
{stuck_section}
RULES:
1. Start with overall sentiment (great week / solid progress / room to improve)
2. Highlight top accomplishment or pattern
3. If stuck tasks exist, gently mention them with encouragement
4. Include week-over-week comparison
5. End with encouragement or actionable suggestion
6. Keep under 150 words

Generate the weekly review:"""


def generate_review(
    _message: str,
    user_id: str,
    db: Session,
    client_date: str | None = None
) -> dict:
    """Generate a weekly progress review."""
    if client_date:
        try:
            current_date = datetime.strptime(client_date, "%Y-%m-%d")
        except ValueError:
            current_date = datetime.now()
    else:
        current_date = datetime.now()

    week_start = current_date - timedelta(days=current_date.weekday())
    week_end = week_start + timedelta(days=6)

    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start - timedelta(days=1)

    goals = get_user_goals(db, user_id)
    this_week = get_completed_in_range(db, user_id, week_start, week_end)
    prev_week = get_completed_in_range(db, user_id, prev_week_start, prev_week_end)
    stuck_tasks = get_stuck_tasks(db, user_id)

    this_week_count = len(this_week)
    prev_week_count = len(prev_week)
    change = this_week_count - prev_week_count

    if prev_week_count > 0:
        change_percent = f"{((this_week_count - prev_week_count) / prev_week_count) * 100:+.0f}%"
    elif this_week_count > 0:
        change_percent = "new baseline"
    else:
        change_percent = "no data"

    high_count = len([t for t in this_week if t.priority.value == "high"])
    medium_count = len([t for t in this_week if t.priority.value == "medium"])
    low_count = len([t for t in this_week if t.priority.value == "low"])

    goal_counts = {}
    goal_map = {g.id: g.name for g in goals}
    for t in this_week:
        goal_name = goal_map.get(t.goal_id, "No goal")
        goal_counts[goal_name] = goal_counts.get(goal_name, 0) + 1

    if goal_counts:
        top_goal_name = max(goal_counts, key=goal_counts.get)
        top_goal = f"{top_goal_name} ({goal_counts[top_goal_name]} tasks)"
    else:
        top_goal = "None yet"

    if this_week:
        task_lines = []
        for t in this_week[:10]:
            goal_name = goal_map.get(t.goal_id, "")
            goal_str = f" [{goal_name}]" if goal_name else ""
            task_lines.append(f"- {t.title} ({t.priority.value}){goal_str}")
        this_week_tasks = "\n".join(task_lines)
        if len(this_week) > 10:
            this_week_tasks += f"\n... and {len(this_week) - 10} more"
    else:
        this_week_tasks = "No completed tasks this week"

    if stuck_tasks:
        stuck_lines = [f"- {t.title} (moved {t.move_count} times)" for t in stuck_tasks[:3]]
        stuck_section = f"\nSTUCK TASKS ({len(stuck_tasks)} tasks moved 3+ times):\n" + "\n".join(stuck_lines) + "\n"
    else:
        stuck_section = ""

    llm = get_llm(temperature=0.5)
    parser = StrOutputParser()

    prompt = ChatPromptTemplate.from_template(SMART_REVIEW_PROMPT)
    chain = prompt | llm | parser

    response = chain.invoke({
        "week_start": week_start.strftime("%b %d"),
        "week_end": week_end.strftime("%b %d"),
        "this_week_count": this_week_count,
        "this_week_tasks": this_week_tasks,
        "change": change,
        "change_percent": change_percent,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "top_goal": top_goal,
        "stuck_section": stuck_section
    })

    return {
        "message": response,
        "actions": None,
        "action_type": None
    }
