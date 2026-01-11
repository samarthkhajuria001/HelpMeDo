from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models import User, Task, Subtask, Goal
from app.models.task import Priority, Status, TimeHorizon
from app.schemas import TaskCreate, TaskUpdate, TaskOut, SubtaskCreate, SubtaskUpdate, SubtaskOut
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_end_of_week() -> date:
    """Get the date of the end of the current week (Sunday)."""
    today = date.today()
    days_until_sunday = 6 - today.weekday()  # weekday(): Mon=0, Sun=6
    if days_until_sunday < 0:
        days_until_sunday = 0
    return today + timedelta(days=days_until_sunday)


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    time_horizon: TimeHorizon | None = None,
    goal_id: str | None = None,
    priority: Priority | None = None,
    status_filter: Status | None = Query(None, alias="status"),
    overdue_min_days: int | None = Query(None, description="Minimum days overdue (exclusive). Use 3 to get tasks 4+ days overdue."),
    overdue_max_days: int | None = Query(None, description="Maximum days overdue (inclusive). Use 3 to get tasks up to 3 days overdue."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List tasks with optional filters.

    For time_horizon filtering, we use actual date comparison instead of stored field:
    - 'today': tasks with no due_date marked as 'today', OR tasks with due_date <= today
    - 'week': tasks with no due_date marked as 'week', OR tasks with due_date > today and <= end of week
    - 'someday': tasks with no due_date marked as 'someday', OR tasks with due_date > end of week

    Overdue filtering (for time_horizon='today'):
    - overdue_max_days: limits how far back to include overdue tasks (e.g., 3 = last 3 days)
    - overdue_min_days: excludes recent overdue tasks (e.g., 3 = only 4+ days overdue)
    """
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if time_horizon:
        today_date = date.today()
        end_of_week = get_end_of_week()

        if time_horizon == TimeHorizon.today:
            # Tasks with no due_date that user marked as 'today'
            # OR tasks with due_date that is today or overdue (within limits)
            overdue_cutoff_max = today_date - timedelta(days=overdue_max_days) if overdue_max_days else None
            overdue_cutoff_min = today_date - timedelta(days=overdue_min_days) if overdue_min_days else None

            if overdue_cutoff_max and overdue_cutoff_min:
                # Both limits: tasks between min and max days overdue
                query = query.filter(
                    or_(
                        and_(Task.due_date == None, Task.time_horizon == TimeHorizon.today),
                        and_(Task.due_date >= overdue_cutoff_max, Task.due_date < overdue_cutoff_min)
                    )
                )
            elif overdue_cutoff_max:
                # Max limit only: tasks from today back to max days ago
                query = query.filter(
                    or_(
                        and_(Task.due_date == None, Task.time_horizon == TimeHorizon.today),
                        and_(Task.due_date >= overdue_cutoff_max, Task.due_date <= today_date)
                    )
                )
            elif overdue_cutoff_min:
                # Min limit only: tasks older than min days
                query = query.filter(
                    or_(
                        and_(Task.due_date == None, Task.time_horizon == TimeHorizon.today),
                        Task.due_date < overdue_cutoff_min
                    )
                )
            else:
                # No limits: all overdue tasks (original behavior)
                query = query.filter(
                    or_(
                        and_(Task.due_date == None, Task.time_horizon == TimeHorizon.today),
                        Task.due_date <= today_date
                    )
                )
        elif time_horizon == TimeHorizon.week:
            # Tasks with no due_date that user marked as 'week'
            # OR tasks with due_date > today and <= end of week
            query = query.filter(
                or_(
                    and_(Task.due_date == None, Task.time_horizon == TimeHorizon.week),
                    and_(Task.due_date > today_date, Task.due_date <= end_of_week)
                )
            )
        elif time_horizon == TimeHorizon.someday:
            # Tasks with no due_date that user marked as 'someday'
            # OR tasks with due_date > end of week
            query = query.filter(
                or_(
                    and_(Task.due_date == None, Task.time_horizon == TimeHorizon.someday),
                    Task.due_date > end_of_week
                )
            )

    if goal_id:
        query = query.filter(Task.goal_id == goal_id)
    if priority:
        query = query.filter(Task.priority == priority)
    if status_filter:
        query = query.filter(Task.status == status_filter)

    return query.order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task."""
    if data.goal_id:
        goal = db.query(Goal).filter(
            Goal.id == data.goal_id,
            Goal.user_id == current_user.id
        ).first()
        if not goal:
            raise HTTPException(status_code=400, detail="Invalid goal_id")

    task = Task(
        user_id=current_user.id,
        **data.model_dump()
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task."""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)

    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == Status.completed and task.status != Status.completed:
            update_data["completed_at"] = datetime.now(timezone.utc)
        elif new_status != Status.completed and task.status == Status.completed:
            update_data["completed_at"] = None

    if "goal_id" in update_data and update_data["goal_id"]:
        goal = db.query(Goal).filter(
            Goal.id == update_data["goal_id"],
            Goal.user_id == current_user.id
        ).first()
        if not goal:
            raise HTTPException(status_code=400, detail="Invalid goal_id")

    # Increment move_count when time_horizon changes
    if "time_horizon" in update_data:
        new_horizon = TimeHorizon(update_data["time_horizon"])
        if task.time_horizon != new_horizon:
            task.move_count = (task.move_count or 0) + 1

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task and all its subtasks."""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return None


@router.post("/{task_id}/subtasks", response_model=SubtaskOut, status_code=status.HTTP_201_CREATED)
async def create_subtask(
    task_id: str,
    data: SubtaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a subtask for a task."""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = Subtask(
        task_id=task_id,
        **data.model_dump()
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskOut)
async def update_subtask(
    task_id: str,
    subtask_id: str,
    data: SubtaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a subtask."""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = db.query(Subtask).filter(
        Subtask.id == subtask_id,
        Subtask.task_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subtask, key, value)

    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subtask(
    task_id: str,
    subtask_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a subtask."""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = db.query(Subtask).filter(
        Subtask.id == subtask_id,
        Subtask.task_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    db.delete(subtask)
    db.commit()
    return None
