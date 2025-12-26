from app.models import Goal


def test_create_goal(client, auth_headers, test_user, db):
    response = client.post(
        "/goals",
        headers=auth_headers,
        json={"name": "New Goal", "color": "green"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Goal"
    assert data["color"] == "green"
    assert data["user_id"] == test_user.id
    assert data["archived"] is False


def test_create_goal_unauthenticated(client):
    response = client.post("/goals", json={"name": "New Goal"})
    assert response.status_code == 403


def test_list_goals(client, auth_headers, test_goal):
    response = client.get("/goals", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == test_goal.name


def test_list_goals_excludes_archived(client, auth_headers, test_user, db):
    archived_goal = Goal(
        user_id=test_user.id,
        name="Archived Goal",
        archived=True
    )
    db.add(archived_goal)
    db.commit()

    response = client.get("/goals", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0

    response = client.get("/goals?include_archived=true", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_list_goals_isolation(client, auth_headers, test_goal, other_user, db):
    other_goal = Goal(
        user_id=other_user.id,
        name="Other User Goal"
    )
    db.add(other_goal)
    db.commit()

    response = client.get("/goals", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == test_goal.name


def test_update_goal(client, auth_headers, test_goal):
    response = client.patch(
        f"/goals/{test_goal.id}",
        headers=auth_headers,
        json={"name": "Updated Goal", "color": "rose"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Goal"
    assert data["color"] == "rose"


def test_update_goal_not_found(client, auth_headers):
    response = client.patch(
        "/goals/nonexistent-id",
        headers=auth_headers,
        json={"name": "Updated"}
    )
    assert response.status_code == 404


def test_update_goal_other_user(client, auth_headers, other_user, db):
    other_goal = Goal(
        user_id=other_user.id,
        name="Other Goal"
    )
    db.add(other_goal)
    db.commit()

    response = client.patch(
        f"/goals/{other_goal.id}",
        headers=auth_headers,
        json={"name": "Hacked"}
    )
    assert response.status_code == 404


def test_delete_goal(client, auth_headers, test_goal, db):
    response = client.delete(f"/goals/{test_goal.id}", headers=auth_headers)
    assert response.status_code == 204

    goal = db.query(Goal).filter(Goal.id == test_goal.id).first()
    assert goal is None


def test_delete_goal_not_found(client, auth_headers):
    response = client.delete("/goals/nonexistent-id", headers=auth_headers)
    assert response.status_code == 404


def test_archive_goal(client, auth_headers, test_goal):
    response = client.patch(
        f"/goals/{test_goal.id}",
        headers=auth_headers,
        json={"archived": True}
    )
    assert response.status_code == 200
    assert response.json()["archived"] is True
