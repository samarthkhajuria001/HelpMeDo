from sqlalchemy.orm import Session
from app.models import Goal, Task


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
