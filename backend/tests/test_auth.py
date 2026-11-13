def register(client, slug="northstar", email="owner@example.com"):
    return client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Northstar Store",
            "organization_slug": slug,
            "email": email,
            "display_name": "Owner",
            "password": "correct horse battery",
        },
    )


def test_registration_login_me_and_logout(client):
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["membership"]["role"] == "owner"
    assert "password" not in body
    access = body["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "owner@example.com"
    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 204


def test_refresh_rotates_and_rejects_reuse(client):
    response = register(client)
    old_cookie = response.cookies.get("supportflow_refresh")
    refreshed = client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    new_cookie = refreshed.cookies.get("supportflow_refresh")
    assert new_cookie and new_cookie != old_cookie
    reused = client.post("/api/v1/auth/refresh", cookies={"supportflow_refresh": old_cookie})
    assert reused.status_code == 401


def test_duplicate_email_and_slug_are_rejected(client):
    assert register(client).status_code == 201
    assert register(client, slug="other", email="owner@example.com").status_code == 409
    assert register(client, slug="northstar", email="other@example.com").status_code == 409

