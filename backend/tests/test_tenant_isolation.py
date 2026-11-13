def test_authentication_context_is_organization_scoped(client):
    first = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Company A",
            "organization_slug": "company-a",
            "email": "a@example.com",
            "display_name": "Agent A",
            "password": "correct horse battery",
        },
    ).json()
    client.post("/api/v1/auth/logout")
    second = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Company B",
            "organization_slug": "company-b",
            "email": "b@example.com",
            "display_name": "Agent B",
            "password": "correct horse battery",
        },
    ).json()
    response = client.get("/api/v1/organizations/current", headers={"Authorization": f"Bearer {second['access_token']}"})
    assert response.status_code == 200
    assert response.json()["id"] != first["membership"]["organization_id"]
    forged = client.get(
        "/api/v1/organizations/current?organization_id=" + first["membership"]["organization_id"],
        headers={"Authorization": f"Bearer {second['access_token']}"},
    )
    assert forged.json()["id"] == second["membership"]["organization_id"]
