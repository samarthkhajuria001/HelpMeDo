import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, SystemMessage

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models import User, ChatMessage
from app.schemas.ai import ChatRequest, ChatResponse
from app.ai.config import get_llm
from app.ai.context import build_user_context

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to the AI assistant."""
    session_id = request.session_id or str(uuid.uuid4())

    # Build user context
    user_context = build_user_context(db, current_user.id)

    # Get agent instructions from user settings
    agent_instructions = current_user.settings.get("agent_instructions", "")

    # Build system prompt
    system_prompt = f"""You are a helpful task management assistant for HelpMeDo app.
You help users organize their tasks, set priorities, and achieve their goals.

{f"User's custom instructions: {agent_instructions}" if agent_instructions else ""}

Current user context:
{user_context}

Be concise and helpful. Focus on actionable advice."""

    # Get LLM and generate response
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=request.message)
    ]

    try:
        response = llm.invoke(messages)
        ai_message = response.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # Save user message
    user_msg = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=request.message,
        message_metadata={},
        created_at=datetime.now(timezone.utc)
    )
    db.add(user_msg)

    # Save assistant message
    assistant_msg = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=ai_message,
        message_metadata={},
        created_at=datetime.now(timezone.utc)
    )
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        message=ai_message,
        session_id=session_id,
        message_metadata={}
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
