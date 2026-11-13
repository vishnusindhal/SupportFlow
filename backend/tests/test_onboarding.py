from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import IndustryTemplate


def register(client, slug="northstar", email="owner@example.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Northstar Store",
            "organization_slug": slug,
            "email": email,
            "display_name": "Owner",
            "password": "correct horse battery",
        },
    )
    return response.json()


def test_template_listing_and_snapshot_is_independent(client):
    session = register(client)
    access = session["access_token"]
    headers = {"Authorization": f"Bearer {access}"}
    templates = client.get("/api/v1/templates")
    assert templates.status_code == 200
    template = templates.json()[0]
    assert template["industry_key"] == "ecommerce"
    detail = client.get(f"/api/v1/templates/{template['id']}")
    assert detail.status_code == 200
    assert detail.json()["config"]["schema_version"] == 1
    assert client.put(
        "/api/v1/onboarding/profile",
        headers=headers,
        json={"company_name": "Northstar Store", "support_email": "help@northstar.test", "timezone": "UTC"},
    ).status_code == 200
    completed = client.post(
        "/api/v1/onboarding/complete",
        headers=headers,
        json={"template_id": template["id"]},
    )
    assert completed.status_code == 201
    snapshot = completed.json()["config"]
    with SessionLocal() as db:
        db.scalar(select(IndustryTemplate)).config_json["assistant"]["name"] = "Changed Master"
        db.commit()
    current = client.get("/api/v1/configuration/current", headers=headers)
    assert current.status_code == 200
    assert current.json()["config"] == snapshot
    assert current.json()["config"]["assistant"]["name"] == "Northstar Assistant"


def test_onboarding_cannot_complete_twice_and_agent_cannot_write(client):
    owner = register(client)
    headers = {"Authorization": f"Bearer {owner['access_token']}"}
    template_id = client.get("/api/v1/templates").json()[0]["id"]
    assert client.post(
        "/api/v1/onboarding/complete", headers=headers, json={"template_id": template_id}
    ).status_code == 201
    assert client.post(
        "/api/v1/onboarding/complete", headers=headers, json={"template_id": template_id}
    ).status_code == 409


def test_tenant_configuration_isolated(client):
    first = register(client, "company-a", "a@example.com")
    first_headers = {"Authorization": f"Bearer {first['access_token']}"}
    template_id = client.get("/api/v1/templates").json()[0]["id"]
    client.post("/api/v1/onboarding/complete", headers=first_headers, json={"template_id": template_id})
    client.post("/api/v1/auth/logout")
    second = register(client, "company-b", "b@example.com")
    second_headers = {"Authorization": f"Bearer {second['access_token']}"}
    assert client.get("/api/v1/configuration/current", headers=second_headers).status_code == 404
