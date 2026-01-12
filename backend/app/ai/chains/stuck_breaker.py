from sqlalchemy.orm import Session
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.ai.config import get_llm
from app.ai.context import (
    get_user_goals,
    get_pending_tasks,
    get_stuck_tasks,
    find_task_to_break_down
)


STUCK_BREAKER_PROMPT = """You are Lufy helping break down a task into smaller subtasks.

TASK TO BREAK DOWN:
Title: {task_title}
Description: {task_description}
Priority: {priority}
Due date: {due_date}
Times moved: {move_count}

RULES:
1. Generate 3-5 specific, actionable subtasks
2. Each subtask should be completable in 15-60 minutes
3. Order subtasks logically (what comes first?)
4. Use clear, action-oriented language ("Write..." not "Writing...")
5. Keep subtask titles under 50 characters
6. Make subtasks specific to this task, not generic

Return valid JSON only:
{{
  "subtasks": [
    {{"title": "string", "description": "optional detail"}},
    ...
  ],
  "message": "Friendly message explaining the breakdown (under 100 words)"
}}"""


NO_TASK_FOUND_PROMPT = """You are Lufy, a task assistant. The user wants to break down a task but no specific task was found.

USER'S STUCK TASKS (moved 3+ times):
{stuck_tasks}

USER'S MESSAGE: {message}

If there are stuck tasks, suggest breaking down the most stuck one.
If no stuck tasks, explain that you couldn't find a task to break down.

Keep response under 100 words."""


def break_down_task(
    message: str,
    user_id: str,
    db: Session,
    _client_date: str | None = None
) -> dict:
    """Break down a stuck or specified task into subtasks."""
    goals = get_user_goals(db, user_id)
    pending_tasks = get_pending_tasks(db, user_id)
    stuck_tasks = get_stuck_tasks(db, user_id)

    # Find the task to break down
    task = find_task_to_break_down(message, pending_tasks)

    if not task:
        # No task found - return helpful message
        from langchain_core.output_parsers import StrOutputParser

        if stuck_tasks:
            stuck_list = "\n".join(
                f"- {t.title} (moved {t.move_count} times)"
                for t in stuck_tasks[:5]
            )
        else:
            stuck_list = "No stuck tasks found."

        llm = get_llm(temperature=0.5)
        prompt = ChatPromptTemplate.from_template(NO_TASK_FOUND_PROMPT)
        chain = prompt | llm | StrOutputParser()

        response = chain.invoke({
            "stuck_tasks": stuck_list,
            "message": message
        })

        return {
            "message": response,
            "actions": None,
            "action_type": None
        }

    # Found a task - generate subtasks
    goal_name = next((g.name for g in goals if g.id == task.goal_id), None)

    llm = get_llm(temperature=0.4)
    parser = JsonOutputParser()

    prompt = ChatPromptTemplate.from_template(STUCK_BREAKER_PROMPT)
    chain = prompt | llm | parser

    result = chain.invoke({
        "task_title": task.title,
        "task_description": task.description or "No description",
        "priority": task.priority.value,
        "due_date": str(task.due_date) if task.due_date else "No due date",
        "move_count": task.move_count or 0
    })

    subtasks = result.get("subtasks", [])
    llm_message = result.get("message", f"Here's how to break down '{task.title}':")

    if not subtasks:
        return {
            "message": f"I couldn't generate subtasks for '{task.title}'. Try being more specific about what this task involves.",
            "actions": None,
            "action_type": None
        }

    # Format actions for frontend
    actions = {
        "parent_task_id": str(task.id),
        "parent_task_title": task.title,
        "subtasks": subtasks
    }

    return {
        "message": llm_message,
        "actions": actions,
        "action_type": "create_subtasks"
    }
