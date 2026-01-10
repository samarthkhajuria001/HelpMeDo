from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.ai.config import get_llm
from app.ai.context import (
    get_user_goals,
    get_today_tasks,
    get_week_tasks,
    format_tasks_for_prompt
)
from app.models import User


REALITY_CHECK_PROMPT = """You are Lufy analyzing the user's daily workload.

TODAY'S DATE: {current_date}

TODAY'S TASKS ({today_count} tasks, ~{total_pomodoros} pomodoros, ~{total_hours:.1f}h of focused work):
{today_tasks}

WEEKLY QUEUE (potential to pull from):
{week_tasks}

WORKLOAD ANALYSIS:
- Status: {status}
- Load: {load_percent}% of daily capacity ({available_hours:.1f}h available)

RULES:
1. If overloaded (>100%): suggest 2-3 specific tasks to defer (prefer low priority, no deadline)
2. If light (<50%): suggest 2-3 tasks to pull from weekly queue (prefer high priority)
3. If manageable (50-100%): affirm the plan, maybe one small suggestion
4. Always mention high-priority tasks that should stay
5. Keep response under 150 words
6. Be encouraging, not stressful

Generate a reality check response:"""


def calculate_workload(tasks: list, user_settings: dict) -> dict:
    """Calculate workload metrics from tasks."""
    total_pomodoros = sum(t.estimated_pomodoros or 1 for t in tasks)
    pomodoro_minutes = user_settings.get("pomodoro_minutes", 25)
    total_minutes = total_pomodoros * pomodoro_minutes
    total_hours = total_minutes / 60

    work_hours = user_settings.get("work_hours_per_day", 8)
    available_hours = work_hours * 0.6

    if available_hours > 0:
        load_ratio = total_hours / available_hours
    else:
        load_ratio = 0

    if load_ratio > 1.2:
        status = "overloaded"
    elif load_ratio > 0.8:
        status = "full"
    elif load_ratio > 0.4:
        status = "manageable"
    else:
        status = "light"

    return {
        "total_pomodoros": total_pomodoros,
        "total_hours": total_hours,
        "available_hours": available_hours,
        "status": status,
        "load_ratio": load_ratio,
        "load_percent": int(load_ratio * 100)
    }


def analyze_workload(
    message: str,
    user_id: str,
    db: Session,
    client_date: str | None = None
) -> dict:
    """Analyze user's daily workload and provide recommendations."""
    user = db.query(User).filter(User.id == user_id).first()
    user_settings = user.settings if user else {}

    goals = get_user_goals(db, user_id)
    today_tasks = get_today_tasks(db, user_id)
    week_tasks = get_week_tasks(db, user_id)

    workload = calculate_workload(today_tasks, user_settings)

    today_formatted = format_tasks_for_prompt(today_tasks, goals)
    week_formatted = format_tasks_for_prompt(week_tasks, goals)

    if client_date:
        current_date = client_date
    else:
        from datetime import datetime
        current_date = datetime.now().strftime("%Y-%m-%d")

    llm = get_llm(temperature=0.4)
    parser = StrOutputParser()

    prompt = ChatPromptTemplate.from_template(REALITY_CHECK_PROMPT)
    chain = prompt | llm | parser

    response = chain.invoke({
        "current_date": current_date,
        "today_count": len(today_tasks),
        "total_pomodoros": workload["total_pomodoros"],
        "total_hours": workload["total_hours"],
        "today_tasks": today_formatted,
        "week_tasks": week_formatted,
        "status": workload["status"],
        "load_percent": workload["load_percent"],
        "available_hours": workload["available_hours"]
    })

    return {
        "message": response,
        "actions": None,
        "action_type": None
    }
