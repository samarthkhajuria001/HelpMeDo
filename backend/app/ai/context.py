from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Goal, Task
from app.models.task import Status, TimeHorizon


def get_user_goals(db: Session, user_id: str) -> list[Goal]:
    """Get user's active (non-archived) goals."""
    return db.query(Goal).filter(Goal.user_id == user_id, Goal.archived == False).all()


def build_user_context(db: Session, user_id: str) -> str:
    """Build context string with user's goals and tasks for LLM."""
    goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.archived == False).all()
    tasks = db.query(Task).filter(Task.user_id == user_id).all()

    context_parts = []

    if goals:
        context_parts.append("USER'S GOALS:")
        for g in goals:
            task_count = len([t for t in tasks if t.goal_id == g.id])
            context_parts.append(f"- {g.name} (color: {g.color}, {task_count} tasks)")

    if tasks:
        context_parts.append("\nUSER'S TASKS:")
        for t in tasks:
            goal_name = next((g.name for g in goals if g.id == t.goal_id), "No goal")
            status = "done" if t.status.value == "completed" else t.time_horizon.value
            due = f", due: {t.due_date}" if t.due_date else ""
            context_parts.append(f"- [{status}] {t.title} (goal: {goal_name}, priority: {t.priority.value}{due})")

    if not context_parts:
        return "User has no goals or tasks yet."

    return "\n".join(context_parts)


def get_today_tasks(db: Session, user_id: str) -> list[Task]:
    """Get user's pending tasks for today."""
    return db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == Status.pending,
        Task.time_horizon == TimeHorizon.today
    ).all()


def get_week_tasks(db: Session, user_id: str) -> list[Task]:
    """Get user's pending tasks for this week."""
    return db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == Status.pending,
        Task.time_horizon == TimeHorizon.week
    ).all()


def get_completed_in_range(
    db: Session,
    user_id: str,
    start_date: datetime,
    end_date: datetime
) -> list[Task]:
    """Get tasks completed within a date range."""
    return db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == Status.completed,
        Task.completed_at >= start_date,
        Task.completed_at <= end_date
    ).all()


def get_stuck_tasks(db: Session, user_id: str, min_moves: int = 3) -> list[Task]:
    """Get pending tasks that have been moved multiple times."""
    return db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == Status.pending,
        Task.move_count >= min_moves
    ).all()


def format_tasks_for_prompt(tasks: list[Task], goals: list[Goal]) -> str:
    """Format tasks list for LLM prompt."""
    if not tasks:
        return "No tasks"

    goal_map = {g.id: g.name for g in goals}
    lines = []
    for t in tasks:
        goal_name = goal_map.get(t.goal_id, "No goal")
        pom = t.estimated_pomodoros or 1
        due = f", due: {t.due_date}" if t.due_date else ""
        lines.append(f"- {t.title} ({t.priority.value} priority, {pom} pom, {goal_name}{due})")
    return "\n".join(lines)


def get_pending_tasks(db: Session, user_id: str) -> list[Task]:
    """Get all pending tasks for a user."""
    return db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == Status.pending
    ).all()


def find_task_to_break_down(message: str, tasks: list[Task]) -> Task | None:
    """Find a task to break down based on user message or stuck status."""
    message_lower = message.lower()

    # First, check if a specific task is mentioned
    for task in tasks:
        if task.title.lower() in message_lower:
            return task

    # Check for partial matches (task title words in message)
    for task in tasks:
        title_words = task.title.lower().split()
        if len(title_words) >= 2:
            matches = sum(1 for word in title_words if word in message_lower)
            if matches >= 2:
                return task

    # Fall back to most stuck task
    stuck = [t for t in tasks if (t.move_count or 0) >= 3]
    if stuck:
        return max(stuck, key=lambda t: t.move_count or 0)

    return None
