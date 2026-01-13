import re
import uuid
from datetime import datetime, timezone, date, time, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models import User, ChatMessage, Task, Goal, GoalColor, Subtask, SubtaskStatus
from app.models.task import Priority, Status, TimeHorizon
from app.schemas.ai import ChatRequest, ChatResponse, ExecuteRequest, ExecuteResponse
from app.ai.router import process_message
from app.ai.config import clear_graph_state

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to the AI assistant."""
    session_id = request.session_id or str(uuid.uuid4())

    custom_instructions = current_user.settings.get("agent_instructions", "")

    history = None
    if request.history:
        history = [{"role": h.role, "content": h.content} for h in request.history]

    try:
        result = process_message(
            message=request.message,
            user_id=current_user.id,
            db=db,
            client_date=request.client_date,
            custom_instructions=custom_instructions,
            history=history,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    user_msg = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=request.message,
        message_metadata={},
        created_at=datetime.now(timezone.utc)
    )
    db.add(user_msg)

    metadata = {}
    if result.get("actions"):
        metadata["actions"] = result["actions"]
        metadata["action_type"] = result["action_type"]

    assistant_msg = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=result["message"],
        message_metadata=metadata,
        created_at=datetime.now(timezone.utc)
    )
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        message=result["message"],
        session_id=session_id,
        message_metadata=metadata if metadata else None,
        actions=result.get("actions"),
        action_type=result.get("action_type")
    )


@router.post("/execute", response_model=ExecuteResponse)
async def execute_action(
    request: ExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute confirmed AI actions (e.g., create tasks, create subtasks, create goal plan)."""
    if request.action_type == "create_goal_plan":
        return await execute_create_goal_plan(request, db, current_user)
    elif request.action_type == "create_subtasks":
        return await execute_create_subtasks(request, db, current_user)
    elif request.action_type != "create_tasks":
        raise HTTPException(status_code=400, detail=f"Unknown action_type: {request.action_type}")

    created_ids = []
    errors = []

    for i, task_data in enumerate(request.data):
        try:
            if task_data.goal_id:
                goal = db.query(Goal).filter(
                    Goal.id == task_data.goal_id,
                    Goal.user_id == current_user.id
                ).first()
                if not goal:
                    errors.append(f"Task {i+1}: Invalid goal")
                    continue

            due_date_parsed = None
            if task_data.due_date:
                try:
                    due_date_parsed = date.fromisoformat(task_data.due_date)
                except ValueError:
                    pass

            due_time_parsed = None
            if task_data.due_time:
                try:
                    due_time_parsed = time.fromisoformat(task_data.due_time)
                except ValueError:
                    pass

            task = Task(
                user_id=current_user.id,
                goal_id=task_data.goal_id,
                title=task_data.title,
                description=task_data.description or "",
                priority=Priority(task_data.priority),
                time_horizon=TimeHorizon(task_data.time_horizon),
                due_date=due_date_parsed,
                due_time=due_time_parsed,
                status=Status.pending,
                source="ai_magic_capture",
                generated_by_agent=True,
                agent_notes=f"Created via Magic Capture"
            )
            db.add(task)
            db.flush()
            created_ids.append(str(task.id))

        except Exception as e:
            errors.append(f"Task {i+1}: {str(e)}")

    db.commit()

    total = len(request.data)
    created_count = len(created_ids)

    # Build message with task list
    created_titles = [t.title for t in request.data[:created_count]]

    if created_count == 0 and errors:
        msg = "Failed to create tasks"
        success = False
    elif created_count < total:
        task_list = "\n".join(f"• {title}" for title in created_titles)
        msg = f"Created {created_count} of {total} tasks:\n{task_list}"
        success = False
    else:
        if created_count == 1:
            msg = f"Created 1 task:\n• {created_titles[0]}"
        else:
            task_list = "\n".join(f"• {title}" for title in created_titles)
            msg = f"Created {created_count} tasks:\n{task_list}"
        success = True

    # Save confirmation message to chat history
    if request.session_id and created_count > 0:
        confirm_msg = ChatMessage(
            user_id=current_user.id,
            session_id=request.session_id,
            role="assistant",
            content=msg,
            message_metadata={"executed_task_ids": created_ids},
            created_at=datetime.now(timezone.utc)
        )
        db.add(confirm_msg)
        db.commit()

    return ExecuteResponse(
        success=success,
        message=msg,
        created_ids=created_ids if created_ids else None,
        errors=errors if errors else None
    )


@router.get("/history")
async def get_chat_history(
    session_id: str = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat history for current user."""
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)

    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)

    messages = query.order_by(ChatMessage.created_at.desc()).limit(limit).all()
    messages.reverse()

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "message_metadata": m.message_metadata,
            "created_at": m.created_at
        }
        for m in messages
    ]


async def execute_create_subtasks(
    request: ExecuteRequest,
    db: Session,
    current_user: User
) -> ExecuteResponse:
    """Create subtasks for a parent task."""
    # Extract data from request - for subtasks, data is a dict not list
    subtask_data = request.data if isinstance(request.data, dict) else {}
    parent_task_id = subtask_data.get("parent_task_id")
    subtasks = subtask_data.get("subtasks", [])

    if not parent_task_id:
        return ExecuteResponse(
            success=False,
            message="No parent task specified",
            errors=["parent_task_id is required"]
        )

    # Verify parent task belongs to user
    parent_task = db.query(Task).filter(
        Task.id == parent_task_id,
        Task.user_id == current_user.id
    ).first()

    if not parent_task:
        return ExecuteResponse(
            success=False,
            message="Task not found",
            errors=["Parent task not found or access denied"]
        )

    # Get current subtask count for ordering
    existing_count = len(parent_task.subtasks) if parent_task.subtasks else 0

    created_ids = []
    created_titles = []
    errors = []

    for i, st in enumerate(subtasks):
        try:
            title = st.get("title", "").strip()
            if not title:
                errors.append(f"Subtask {i+1}: Empty title")
                continue

            subtask = Subtask(
                task_id=parent_task_id,
                title=title,
                description=st.get("description", ""),
                order=existing_count + i,
                status=SubtaskStatus.pending,
                generated_by_agent=True
            )
            db.add(subtask)
            db.flush()
            created_ids.append(str(subtask.id))
            created_titles.append(title)

        except Exception as e:
            errors.append(f"Subtask {i+1}: {str(e)}")

    db.commit()

    created_count = len(created_ids)

    if created_count == 0:
        return ExecuteResponse(
            success=False,
            message="Failed to create subtasks",
            errors=errors if errors else ["No subtasks created"]
        )

    # Build success message
    subtask_list = "\n".join(f"• {title}" for title in created_titles)
    msg = f"Added {created_count} subtasks to '{parent_task.title}':\n{subtask_list}"

    # Save confirmation to chat history
    if request.session_id:
        confirm_msg = ChatMessage(
            user_id=current_user.id,
            session_id=request.session_id,
            role="assistant",
            content=msg,
            message_metadata={"parent_task_id": parent_task_id, "subtask_ids": created_ids},
            created_at=datetime.now(timezone.utc)
        )
        db.add(confirm_msg)
        db.commit()

    return ExecuteResponse(
        success=True,
        message=msg,
        created_ids=created_ids
    )


async def execute_create_goal_plan(
    request: ExecuteRequest,
    db: Session,
    current_user: User
) -> ExecuteResponse:
    """Create a goal with all its associated tasks from a deep plan."""
    plan_data = request.data

    if not isinstance(plan_data, dict):
        return ExecuteResponse(
            success=False,
            message="Invalid plan data format",
            errors=["Expected dict with goal and tasks"]
        )

    try:
        goal_color = parse_goal_color(plan_data.get("goal_color"))

        goal = Goal(
            user_id=current_user.id,
            name=plan_data.get("goal_title", "Untitled Goal"),
            color=goal_color,
            archived=False
        )
        db.add(goal)
        db.flush()

        goal_id = str(goal.id)
        created_task_ids = []
        created_titles = []
        errors = []

        tasks = plan_data.get("tasks", [])
        for i, task_data in enumerate(tasks):
            try:
                due_date_val = calculate_due_date_from_week(task_data.get("week_range"))

                priority_str = task_data.get("priority", "medium")
                try:
                    priority = Priority(priority_str)
                except ValueError:
                    priority = Priority.medium

                task = Task(
                    user_id=current_user.id,
                    goal_id=goal.id,
                    title=task_data.get("title", f"Task {i+1}"),
                    description=task_data.get("description", ""),
                    priority=priority,
                    time_horizon=TimeHorizon.week,
                    due_date=due_date_val,
                    estimated_pomodoros=task_data.get("estimated_pomodoros"),
                    status=Status.pending,
                    source="ai_deep_plan",
                    generated_by_agent=True,
                    agent_notes=f"Part of plan: {plan_data.get('goal_title', 'Unknown')}"
                )
                db.add(task)
                db.flush()
                created_task_ids.append(str(task.id))
                created_titles.append(task.title)

            except Exception as e:
                errors.append(f"Task {i+1}: {str(e)}")

        db.commit()

        task_count = len(created_task_ids)

        if task_count == 0:
            db.rollback()
            return ExecuteResponse(
                success=False,
                message="Failed to create tasks for the plan",
                errors=errors if errors else ["No tasks created"]
            )

        if request.session_id:
            clear_graph_state(request.session_id)

        task_list = "\n".join(f"• {title}" for title in created_titles[:5])
        if task_count > 5:
            task_list += f"\n• ...and {task_count - 5} more"

        msg = f"Created goal '{goal.name}' with {task_count} tasks:\n{task_list}"

        if request.session_id:
            confirm_msg = ChatMessage(
                user_id=current_user.id,
                session_id=request.session_id,
                role="assistant",
                content=msg,
                message_metadata={"goal_id": goal_id, "task_ids": created_task_ids},
                created_at=datetime.now(timezone.utc)
            )
            db.add(confirm_msg)
            db.commit()

        return ExecuteResponse(
            success=True,
            message=msg,
            created_ids=[goal_id] + created_task_ids
        )

    except Exception as e:
        db.rollback()
        return ExecuteResponse(
            success=False,
            message=f"Failed to create plan: {str(e)}",
            errors=[str(e)]
        )


def parse_goal_color(color_value: str | None) -> GoalColor:
    """Map color name or hex string to GoalColor enum."""
    if not color_value:
        return GoalColor.blue

    color_lower = color_value.lower().strip()

    # Direct name match
    name_map = {
        "blue": GoalColor.blue,
        "green": GoalColor.green,
        "amber": GoalColor.amber,
        "rose": GoalColor.rose,
        "violet": GoalColor.violet,
        "cyan": GoalColor.cyan,
        "red": GoalColor.rose,
        "purple": GoalColor.violet,
        "pink": GoalColor.rose,
    }

    if color_lower in name_map:
        return name_map[color_lower]

    # Hex fallback
    hex_map = {
        "#3B82F6": GoalColor.blue,
        "#10B981": GoalColor.green,
        "#F59E0B": GoalColor.amber,
        "#EF4444": GoalColor.rose,
        "#8B5CF6": GoalColor.violet,
        "#06B6D4": GoalColor.cyan,
    }

    hex_upper = color_value.upper()
    if hex_upper in hex_map:
        return hex_map[hex_upper]

    return GoalColor.blue


def get_coming_sunday(current_date: date) -> date:
    """Get the coming Sunday (or today if today is Sunday)."""
    if current_date.weekday() == 6:  # Today is Sunday
        return current_date
    days_until_sunday = 6 - current_date.weekday()
    return current_date + timedelta(days=days_until_sunday)


def calculate_due_date_from_week(week_range: str | None) -> date:
    """Convert 'Week 1-2' or 'Week 5-8' to an actual due date (end of range).

    If week_range is None or can't be parsed, defaults to coming Sunday.
    """
    today = date.today()
    default_due = get_coming_sunday(today)

    if not week_range:
        return default_due

    match = re.search(r'Week\s*(\d+)(?:\s*-\s*(\d+))?', week_range, re.IGNORECASE)
    if not match:
        return default_due

    start_week = int(match.group(1))
    end_week = int(match.group(2)) if match.group(2) else start_week

    days_to_add = end_week * 7
    return today + timedelta(days=days_to_add)
