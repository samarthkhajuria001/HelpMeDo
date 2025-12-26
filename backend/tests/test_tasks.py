from app.models import Task, Subtask


def test_create_task(client, auth_headers, test_user):
    response = client.post(
        "/tasks",
        headers=auth_headers,
        json={"title": "New Task", "priority": "high"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Task"
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert data["user_id"] == test_user.id


def test_create_task_with_goal(client, auth_headers, test_goal):
    response = client.post(
        "/tasks",
        headers=auth_headers,
        json={"title": "Task with Goal", "goal_id": test_goal.id}
    )
    assert response.status_code == 201
    assert response.json()["goal_id"] == test_goal.id


def test_create_task_invalid_goal(client, auth_headers):
    response = client.post(
        "/tasks",
        headers=auth_headers,
        json={"title": "Task", "goal_id": "invalid-goal-id"}
    )
    assert response.status_code == 400


def test_create_task_unauthenticated(client):
    response = client.post("/tasks", json={"title": "Task"})
    assert response.status_code == 403


def test_list_tasks(client, auth_headers, test_task):
    response = client.get("/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == test_task.title


def test_list_tasks_filter_by_priority(client, auth_headers, test_user, db):
    high_task = Task(user_id=test_user.id, title="High", priority="high")
    low_task = Task(user_id=test_user.id, title="Low", priority="low")
    db.add_all([high_task, low_task])
    db.commit()

    response = client.get("/tasks?priority=high", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["priority"] == "high"


def test_list_tasks_filter_by_status(client, auth_headers, test_user, db):
    pending = Task(user_id=test_user.id, title="Pending", status="pending")
    completed = Task(user_id=test_user.id, title="Done", status="completed")
    db.add_all([pending, completed])
    db.commit()

    response = client.get("/tasks?status=completed", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "completed"


def test_list_tasks_filter_by_time_horizon(client, auth_headers, test_user, db):
    today = Task(user_id=test_user.id, title="Today", time_horizon="today")
    week = Task(user_id=test_user.id, title="Week", time_horizon="week")
    db.add_all([today, week])
    db.commit()

    response = client.get("/tasks?time_horizon=week", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["time_horizon"] == "week"


def test_list_tasks_isolation(client, auth_headers, test_task, other_user, db):
    other_task = Task(user_id=other_user.id, title="Other Task")
    db.add(other_task)
    db.commit()

    response = client.get("/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == test_task.title


def test_update_task(client, auth_headers, test_task):
    response = client.patch(
        f"/tasks/{test_task.id}",
        headers=auth_headers,
        json={"title": "Updated Task", "priority": "low"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Task"
    assert data["priority"] == "low"


def test_update_task_complete(client, auth_headers, test_task):
    response = client.patch(
        f"/tasks/{test_task.id}",
        headers=auth_headers,
        json={"status": "completed"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["completed_at"] is not None


def test_update_task_uncomplete(client, auth_headers, test_user, db):
    task = Task(user_id=test_user.id, title="Done", status="completed")
    db.add(task)
    db.commit()
    db.refresh(task)

    response = client.patch(
        f"/tasks/{task.id}",
        headers=auth_headers,
        json={"status": "pending"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert data["completed_at"] is None


def test_update_task_not_found(client, auth_headers):
    response = client.patch(
        "/tasks/nonexistent-id",
        headers=auth_headers,
        json={"title": "Updated"}
    )
    assert response.status_code == 404


def test_update_task_other_user(client, auth_headers, other_user, db):
    other_task = Task(user_id=other_user.id, title="Other Task")
    db.add(other_task)
    db.commit()

    response = client.patch(
        f"/tasks/{other_task.id}",
        headers=auth_headers,
        json={"title": "Hacked"}
    )
    assert response.status_code == 404


def test_delete_task(client, auth_headers, test_task, db):
    response = client.delete(f"/tasks/{test_task.id}", headers=auth_headers)
    assert response.status_code == 204

    task = db.query(Task).filter(Task.id == test_task.id).first()
    assert task is None


def test_delete_task_not_found(client, auth_headers):
    response = client.delete("/tasks/nonexistent-id", headers=auth_headers)
    assert response.status_code == 404


# Subtask tests

def test_create_subtask(client, auth_headers, test_task):
    response = client.post(
        f"/tasks/{test_task.id}/subtasks",
        headers=auth_headers,
        json={"title": "New Subtask"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Subtask"
    assert data["task_id"] == test_task.id
    assert data["status"] == "pending"


def test_create_subtask_task_not_found(client, auth_headers):
    response = client.post(
        "/tasks/nonexistent-id/subtasks",
        headers=auth_headers,
        json={"title": "Subtask"}
    )
    assert response.status_code == 404


def test_update_subtask(client, auth_headers, test_task, db):
    subtask = Subtask(task_id=test_task.id, title="Subtask")
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    response = client.patch(
        f"/tasks/{test_task.id}/subtasks/{subtask.id}",
        headers=auth_headers,
        json={"title": "Updated Subtask", "status": "completed"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Subtask"
    assert data["status"] == "completed"


def test_update_subtask_not_found(client, auth_headers, test_task):
    response = client.patch(
        f"/tasks/{test_task.id}/subtasks/nonexistent-id",
        headers=auth_headers,
        json={"title": "Updated"}
    )
    assert response.status_code == 404


def test_delete_subtask(client, auth_headers, test_task, db):
    subtask = Subtask(task_id=test_task.id, title="Subtask")
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    response = client.delete(
        f"/tasks/{test_task.id}/subtasks/{subtask.id}",
        headers=auth_headers
    )
    assert response.status_code == 204

    deleted = db.query(Subtask).filter(Subtask.id == subtask.id).first()
    assert deleted is None


def test_delete_subtask_not_found(client, auth_headers, test_task):
    response = client.delete(
        f"/tasks/{test_task.id}/subtasks/nonexistent-id",
        headers=auth_headers
    )
    assert response.status_code == 404
