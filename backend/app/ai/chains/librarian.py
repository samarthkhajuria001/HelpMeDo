from datetime import datetime, timedelta, date
from calendar import monthrange
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from langchain_core.prompts import ChatPromptTemplate
from app.ai.config import get_llm
from app.models import Goal, Task
from app.models.task import Status, TimeHorizon


class QueryIntent(BaseModel):
    """Parsed query intent from user message."""
    query_type: str = Field(description="One of: tasks_by_date, tasks_by_goal, tasks_by_priority, task_count, general_question")
    time_range: str | None = Field(default=None, description="One of: today, tomorrow, this_week, next_week, this_month, this_year, overdue, all, or None")
    goal_filter: str | None = Field(default=None, description="Goal name to filter by, or None")
    priority_filter: str | None = Field(default=None, description="One of: high, medium, low, or None")
    status_filter: str = Field(default="pending", description="One of: pending, completed, all")
    response_intro: str = Field(description="Brief intro sentence for the response")


QUERY_PARSER_PROMPT = """Parse the user's question about their tasks.

CURRENT DATE: {current_date} ({day_of_week})

Examples:
- "what's due this week" → query_type: tasks_by_date, time_range: this_week
- "tasks for this month" → query_type: tasks_by_date, time_range: this_month
- "what do I have this year" → query_type: tasks_by_date, time_range: this_year
- "show my high priority tasks" → query_type: tasks_by_priority, priority_filter: high
- "tasks for Learning Japanese" → query_type: tasks_by_goal, goal_filter: Learning Japanese
- "what did I complete today" → query_type: tasks_by_date, time_range: today, status_filter: completed
- "how many tasks do I have" → query_type: task_count

User question: {question}"""


# ============ Date Helper Functions ============

def get_coming_sunday(current_date: date) -> date:
    """Get the coming Sunday (or today if today is Sunday)."""
    days_until_sunday = (6 - current_date.weekday()) % 7
    if days_until_sunday == 0 and current_date.weekday() != 6:
        days_until_sunday = 7
    if current_date.weekday() == 6:  # Today is Sunday
        return current_date
    return current_date + timedelta(days=days_until_sunday)


def get_next_week_range(current_date: date) -> tuple[date, date]:
    """Get next Monday to next Sunday."""
    days_until_next_monday = (7 - current_date.weekday()) % 7
    if days_until_next_monday == 0:
        days_until_next_monday = 7
    next_monday = current_date + timedelta(days=days_until_next_monday)
    next_sunday = next_monday + timedelta(days=6)
    return next_monday, next_sunday


def get_end_of_month(current_date: date) -> date:
    """Get last day of current month."""
    _, last_day = monthrange(current_date.year, current_date.month)
    return date(current_date.year, current_date.month, last_day)


def get_end_of_year(current_date: date) -> date:
    """Get Dec 31 of current year."""
    return date(current_date.year, 12, 31)


# ============ Main Functions ============

def answer_question(
    question: str,
    user_id: str,
    db: Session,
    client_date: str | None = None
) -> dict:
    """Answer a question about user's tasks using structured query parsing."""

    if client_date:
        current_date = datetime.strptime(client_date, "%Y-%m-%d").date()
    else:
        current_date = date.today()

    day_of_week = current_date.strftime("%A")

    # Parse the query intent
    llm = get_llm(model="gpt-4o-mini", temperature=0).with_structured_output(QueryIntent)
    prompt = ChatPromptTemplate.from_template(QUERY_PARSER_PROMPT)

    intent = llm.invoke(prompt.format(
        current_date=current_date.strftime("%Y-%m-%d"),
        day_of_week=day_of_week,
        question=question
    ))

    # Query database based on intent
    tasks = query_tasks(db, user_id, intent, current_date)
    goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.archived == False).all()
    goal_map = {g.id: g.name for g in goals}

    # Format response
    response = format_task_response(tasks, goal_map, intent)

    return {
        "message": response,
        "actions": None,
        "action_type": None
    }


def query_tasks(db: Session, user_id: str, intent: QueryIntent, current_date: date) -> list[Task]:
    """Query tasks based on parsed intent."""
    query = db.query(Task).filter(Task.user_id == user_id)

    # Status filter
    if intent.status_filter == "pending":
        query = query.filter(Task.status == Status.pending)
    elif intent.status_filter == "completed":
        query = query.filter(Task.status == Status.completed)

    # Time range filter - due_date takes precedence over time_horizon
    if intent.time_range:
        if intent.time_range == "today":
            # Tasks due today, OR tasks in "today" tab without a due_date
            query = query.filter(
                or_(
                    Task.due_date == current_date,
                    and_(
                        Task.time_horizon == TimeHorizon.today,
                        Task.due_date == None
                    )
                )
            )

        elif intent.time_range == "this_week":
            # Tasks due by coming Sunday, OR tasks in "week" tab without a due_date
            coming_sunday = get_coming_sunday(current_date)
            query = query.filter(
                or_(
                    and_(
                        Task.due_date != None,
                        Task.due_date <= coming_sunday
                    ),
                    and_(
                        Task.time_horizon == TimeHorizon.week,
                        Task.due_date == None
                    )
                )
            )

        elif intent.time_range == "next_week":
            # Tasks due between next Monday and next Sunday
            next_monday, next_sunday = get_next_week_range(current_date)
            query = query.filter(
                Task.due_date != None,
                Task.due_date >= next_monday,
                Task.due_date <= next_sunday
            )

        elif intent.time_range == "this_month":
            # Tasks due by end of this month
            end_of_month = get_end_of_month(current_date)
            query = query.filter(
                Task.due_date != None,
                Task.due_date <= end_of_month
            )

        elif intent.time_range == "this_year":
            # Tasks due by end of this year
            end_of_year = get_end_of_year(current_date)
            query = query.filter(
                Task.due_date != None,
                Task.due_date <= end_of_year
            )

        elif intent.time_range == "tomorrow":
            tomorrow = current_date + timedelta(days=1)
            query = query.filter(Task.due_date == tomorrow)

        elif intent.time_range == "overdue":
            query = query.filter(
                Task.due_date != None,
                Task.due_date < current_date
            )

    # Priority filter
    if intent.priority_filter:
        query = query.filter(Task.priority == intent.priority_filter)

    # Goal filter (by name)
    if intent.goal_filter:
        goal = db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.name.ilike(f"%{intent.goal_filter}%")
        ).first()
        if goal:
            query = query.filter(Task.goal_id == goal.id)

    return query.order_by(Task.due_date.asc().nullslast(), Task.priority.desc()).all()


def format_task_response(tasks: list[Task], goal_map: dict, intent: QueryIntent) -> str:
    """Format tasks into a clean numbered list."""
    if not tasks:
        return f"{intent.response_intro}\n\nNo tasks found. Would you like me to create some?"

    lines = [intent.response_intro, ""]

    # Group by goal
    grouped: dict[str, list[Task]] = {}
    no_goal_tasks: list[Task] = []

    for task in tasks:
        if task.goal_id and task.goal_id in goal_map:
            goal_name = goal_map[task.goal_id]
            if goal_name not in grouped:
                grouped[goal_name] = []
            grouped[goal_name].append(task)
        else:
            no_goal_tasks.append(task)

    task_num = 1

    # Tasks without goals first
    for task in no_goal_tasks:
        lines.append(format_single_task(task, task_num))
        task_num += 1

    # Then grouped by goal
    for goal_name, goal_tasks in grouped.items():
        if no_goal_tasks or list(grouped.keys()).index(goal_name) > 0:
            lines.append("")  # Blank line between groups
        lines.append(f"**{goal_name}:**")
        for task in goal_tasks:
            lines.append(format_single_task(task, task_num, indent=True))
            task_num += 1

    lines.append("")
    lines.append("Need help with any of these?")

    return "\n".join(lines)


def format_single_task(task: Task, num: int, indent: bool = False) -> str:
    """Format a single task line."""
    prefix = "   " if indent else ""

    # Format due date nicely
    due_str = ""
    if task.due_date:
        due_str = f" — due {task.due_date.strftime('%a, %b %d')}"

    # Priority badge
    priority_str = ""
    if task.priority:
        priority_str = f" — {task.priority.value} priority"

    return f"{prefix}{num}. **{task.title}**{due_str}{priority_str}"
