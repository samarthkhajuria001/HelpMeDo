def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_me_authenticated(client, auth_headers, test_user):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name


def test_get_me_unauthenticated(client):
    response = client.get("/auth/me")
    assert response.status_code == 403


def test_get_me_invalid_token(client):
    headers = {"Authorization": "Bearer invalid-token"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401


def test_logout(client, auth_headers):
    response = client.post("/auth/logout", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out"}
