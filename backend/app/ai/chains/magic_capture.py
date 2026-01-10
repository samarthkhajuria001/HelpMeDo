from datetime import datetime, timedelta
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.ai.config import get_llm
from app.schemas.ai import ParsedTask, MagicCaptureOutput
import dateparser


MAGIC_CAPTURE_PROMPT = """You are a task parser for a productivity app.
Parse the user's message into structured tasks.

USER'S GOALS (assign tasks to the most relevant goal by name, or null if none fit):
{goals_list}

CURRENT DATE: {current_date} ({day_of_week})

RULES:
1. Each distinct action item becomes a separate task
2. Extract due dates from phrases like "tomorrow", "next tuesday", "friday", "end of month"
3. Match tasks to goals by context (e.g., "call mom" with "Family" goal = goal_name: "Family")
4. Default priority is "medium" unless urgency words present ("urgent", "asap", "important" = "high")
5. If a time is mentioned ("at 3pm", "2:30"), extract it as due_time in HH:MM format (24h)
6. For due_date, output in YYYY-MM-DD format

USER MESSAGE: {message}

Respond with valid JSON only:
{{"tasks": [{{"title": "string", "description": null, "priority": "high" | "medium" | "low", "due_date": "YYYY-MM-DD" or null, "due_time": "HH:MM" or null, "goal_name": "exact goal name from list" or null}}], "message": "Found X task(s). Ready to create them?"}}"""


def format_goals_for_prompt(goals: list) -> str:
    if not goals:
        return "No goals defined yet."

    lines = []
    for goal in goals:
        lines.append(f"- {goal.name} ({goal.color})")
    return "\n".join(lines)


def calculate_time_horizon(due_date_str: str | None, current_date: datetime) -> str:
    if not due_date_str:
        return "someday"

    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    except ValueError:
        return "someday"

    today = current_date.date()
    days_until = (due_date - today).days

    if days_until <= 0:
        return "today"
    elif days_until <= 7:
        return "week"
    else:
        return "someday"


def parse_tasks(message: str, goals: list, client_date: str | None) -> MagicCaptureOutput:
    if client_date:
        try:
            current_date = datetime.strptime(client_date, "%Y-%m-%d")
        except ValueError:
            current_date = datetime.now()
    else:
        current_date = datetime.now()

    day_of_week = current_date.strftime("%A")
    goals_list = format_goals_for_prompt(goals)

    llm = get_llm(temperature=0.2)
    parser = JsonOutputParser()

    prompt = ChatPromptTemplate.from_template(MAGIC_CAPTURE_PROMPT)
    chain = prompt | llm | parser

    result = chain.invoke({
        "message": message,
        "goals_list": goals_list,
        "current_date": current_date.strftime("%Y-%m-%d"),
        "day_of_week": day_of_week
    })

    tasks = []
    raw_tasks = result.get("tasks", [])

    for raw_task in raw_tasks:
        title = raw_task.get("title", "").strip()
        if not title:
            continue

        due_date = raw_task.get("due_date")
        if due_date and not validate_date_format(due_date):
            parsed = dateparser.parse(due_date, settings={
                "PREFER_DATES_FROM": "future",
                "RELATIVE_BASE": current_date
            })
            if parsed:
                due_date = parsed.strftime("%Y-%m-%d")
            else:
                due_date = None

        goal_name = raw_task.get("goal_name")
        if goal_name:
            valid_names = [g.name for g in goals]
            if goal_name not in valid_names:
                goal_name = None

        task = ParsedTask(
            title=title,
            description=raw_task.get("description"),
            priority=raw_task.get("priority", "medium"),
            due_date=due_date,
            due_time=raw_task.get("due_time"),
            goal_name=goal_name
        )
        tasks.append(task)

    task_count = len(tasks)
    if task_count == 0:
        msg = "I couldn't find any tasks in your message. Try something like 'buy milk, call mom tomorrow'."
    elif task_count == 1:
        msg = "Found 1 task. Ready to create it?"
    else:
        msg = f"Found {task_count} tasks. Ready to create them?"

    return MagicCaptureOutput(tasks=tasks, message=msg)


def validate_date_format(date_str: str) -> bool:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False
