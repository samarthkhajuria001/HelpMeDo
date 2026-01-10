import uuid
from datetime import datetime, timezone, date, time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models import User, ChatMessage, Task, Goal
from app.models.task import Priority, Status, TimeHorizon
from app.schemas.ai import ChatRequest, ChatResponse, ExecuteRequest, ExecuteResponse
from app.ai.router import process_message

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
            history=history
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
    """Execute confirmed AI actions (e.g., create tasks)."""
    if request.action_type != "create_tasks":
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

    if created_count == 0 and errors:
        return ExecuteResponse(
            success=False,
            message="Failed to create tasks",
            errors=errors
        )
    elif created_count < total:
        return ExecuteResponse(
            success=False,
            message=f"Created {created_count} of {total} tasks",
            created_ids=created_ids,
            errors=errors
        )
    else:
        msg = f"Created {created_count} task" if created_count == 1 else f"Created {created_count} tasks"
        return ExecuteResponse(
            success=True,
            message=msg,
            created_ids=created_ids
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
