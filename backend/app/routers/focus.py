from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.database import get_db
from app.models import User, Task, FocusSession
from app.models.focus_session import SessionStatus
from app.schemas import (
    FocusSessionStart,
    FocusSessionOut,
    FocusSessionActive,
    FocusSessionPauseResponse,
    FocusSessionResumeResponse,
    FocusSessionCompleteResponse,
    FocusSessionAbandonResponse,
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/focus", tags=["focus"])


def ensure_utc(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware UTC (fixes SQLite naive datetime issue)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def get_active_session_for_user(db: Session, user_id: str) -> FocusSession | None:
    """Helper to get active session for a user."""
    return db.query(FocusSession).filter(
        FocusSession.user_id == user_id,
        FocusSession.status == SessionStatus.active
    ).first()


def close_open_pause(session: FocusSession, now: datetime) -> None:
    """If session has an open pause, close it and update totals."""
    pauses = list(session.pauses or [])  # Create a copy to ensure mutation is detected
    if pauses and pauses[-1].get("resumed_at") is None:
        paused_at_str = pauses[-1]["paused_at"]
        # Handle both 'Z' suffix and '+00:00' format
        if paused_at_str.endswith("Z"):
            paused_at_str = paused_at_str[:-1] + "+00:00"
        paused_at = datetime.fromisoformat(paused_at_str)
        paused_at = ensure_utc(paused_at)  # Ensure timezone-aware
        pause_duration = int((now - paused_at).total_seconds())

        pauses[-1]["resumed_at"] = now.isoformat()
        session.pauses = pauses
        session.total_pause_seconds += pause_duration
        flag_modified(session, "pauses")  # Explicitly mark JSON as modified


@router.get("/active", response_model=FocusSessionActive)
async def get_active(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current active focus session, if any."""
    session = get_active_session_for_user(db, current_user.id)
    return {"session": session}


@router.post("/start", response_model=FocusSessionOut, status_code=status.HTTP_201_CREATED)
async def start_session(
    data: FocusSessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new focus session for a task."""
    # Check no active session exists
    existing = get_active_session_for_user(db, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active session already exists. Complete or abandon it first."
        )

    # Check task exists and belongs to user
    task = db.query(Task).filter(
        Task.id == data.task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get user's preferred focus duration from settings
    planned_seconds = 1500  # default 25 minutes
    user_settings = current_user.settings or {}
    pomodoro_settings = user_settings.get("pomodoro", {})
    if pomodoro_settings.get("focus_seconds"):
        planned_seconds = pomodoro_settings["focus_seconds"]

    now = datetime.now(timezone.utc)

    # Create focus session
    session = FocusSession(
        task_id=data.task_id,
        user_id=current_user.id,
        started_at=now,
        planned_seconds=planned_seconds,
        status=SessionStatus.active,
        pause_count=0,
        total_pause_seconds=0,
        pauses=[],
        metadata_={},
        created_at=now
    )

    # Set first_focused_at on task if not already set
    if task.first_focused_at is None:
        task.first_focused_at = now

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


@router.post("/pause", response_model=FocusSessionPauseResponse)
async def pause_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause the current active focus session."""
    session = get_active_session_for_user(db, current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session"
        )

    # Check if already paused
    pauses = session.pauses or []
    if pauses and pauses[-1].get("resumed_at") is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session already paused"
        )

    now = datetime.now(timezone.utc)

    # Add new pause entry
    pauses = list(pauses)  # Create a copy to ensure mutation is detected
    pauses.append({"paused_at": now.isoformat()})
    session.pauses = pauses
    session.pause_count += 1
    flag_modified(session, "pauses")  # Explicitly mark JSON as modified

    db.commit()

    return {
        "session_id": session.id,
        "pause_count": session.pause_count,
        "paused_at": now.isoformat()
    }


@router.post("/resume", response_model=FocusSessionResumeResponse)
async def resume_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume a paused focus session."""
    session = get_active_session_for_user(db, current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session"
        )

    # Check if actually paused
    pauses = session.pauses or []
    if not pauses or pauses[-1].get("resumed_at") is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not paused"
        )

    now = datetime.now(timezone.utc)

    # Close the pause
    close_open_pause(session, now)

    db.commit()

    return {
        "session_id": session.id,
        "pause_count": session.pause_count,
        "total_pause_seconds": session.total_pause_seconds
    }


@router.post("/complete", response_model=FocusSessionCompleteResponse)
async def complete_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete the current focus session (pomodoro finished)."""
    session = get_active_session_for_user(db, current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session"
        )

    now = datetime.now(timezone.utc)

    # Auto-close any open pause
    close_open_pause(session, now)

    # End the session
    session.ended_at = now
    session.status = SessionStatus.completed

    # Calculate actual focus time (ensure timezone-aware comparison)
    started_at = ensure_utc(session.started_at)
    total_elapsed = int((now - started_at).total_seconds())
    session.actual_seconds = total_elapsed - session.total_pause_seconds

    # Increment task's actual_pomodoros
    task = db.query(Task).filter(Task.id == session.task_id).first()
    if task:
        task.actual_pomodoros += 1

    db.commit()

    return {
        "session_id": session.id,
        "actual_seconds": session.actual_seconds,
        "task_actual_pomodoros": task.actual_pomodoros if task else 0
    }


@router.post("/abandon", response_model=FocusSessionAbandonResponse)
async def abandon_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Abandon the current focus session (quit early without completing)."""
    session = get_active_session_for_user(db, current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session"
        )

    now = datetime.now(timezone.utc)

    # Auto-close any open pause
    close_open_pause(session, now)

    # End the session as abandoned
    session.ended_at = now
    session.status = SessionStatus.abandoned

    # Calculate actual focus time (ensure timezone-aware comparison)
    started_at = ensure_utc(session.started_at)
    total_elapsed = int((now - started_at).total_seconds())
    session.actual_seconds = total_elapsed - session.total_pause_seconds

    # Do NOT increment task's actual_pomodoros

    db.commit()

    return {
        "session_id": session.id,
        "actual_seconds": session.actual_seconds
    }
