"""Business rules created from the UI must be followed in chat."""

import pytest

from app.db.session import SessionLocal
from app.models import CompanyRule, Organization
from app.services.flow import classify_intent


def register(client, slug):
    return client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": slug,
            "organization_slug": slug,
            "email": f"{slug}@example.com",
            "display_name": "Owner",
            "password": "correct horse battery",
        },
    ).json()


def headers(session):
    return {"Authorization": "Bearer " + session["access_token"]}


def create_rule(client, auth, field, operator, value, action="escalate", rule_priority=10, **action_extra):
    return client.post(
        "/api/v1/rules",
        headers=auth,
        json={
            "name": f"{field} {operator} {value}",
            "conditions": [{"field": field, "operator": operator, "value": value}],
            "logic": "all",
            "action": {"type": action, "message": f"rule:{value}", **action_extra},
            "priority": rule_priority,
            "enabled": True,
        },
    )


def chat(client, auth, text):
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()["id"]
    return client.post(
        f"/api/v1/chat/conversations/{conversation}/messages", headers=auth, json={"content": text}
    ).json()


@pytest.mark.parametrize(
    ("text", "intent"),
    [
        ("Where is my order ORD-1234?", "order_status"),
        ("Can you track my parcel?", "order_status"),
        ("My blender arrived damaged", "damaged_item"),
        ("The lamp is broken", "damaged_item"),
        ("I want to cancel my order", "cancellation"),
        ("Can I return my jacket for a refund?", "returns"),
        ("I want to talk to an agent", "talk_to_agent"),
        ("What are your store hours?", "knowledge_question"),
    ],
)
def test_intent_classifier(text, intent):
    assert classify_intent(text) == intent


@pytest.mark.parametrize(
    ("value", "text"),
    [
        ("order_status", "Where is my order ORD-1234?"),
        ("damaged_item", "My blender arrived damaged"),
        ("cancellation", "I want to cancel my order"),
        ("returns", "Can I return my jacket for a refund?"),
    ],
)
def test_intent_rules_fire_without_a_configured_flow(client, value, text):
    auth = headers(register(client, f"rc-{value.replace('_', '-')}"))
    assert create_rule(client, auth, "intent", "equals", value).status_code == 201
    body = chat(client, auth, text)
    assert body["intent"] == value
    assert body["action"] == "escalate"
    assert body["answer"] == f"rule:{value}"
    assert body["ticket_id"]
    assert body["rule_name"] == f"intent equals {value}"


def test_in_list_accepts_comma_separated_text_and_ignores_case(client):
    auth = headers(register(client, "rc-in"))
    create_rule(client, auth, "intent", "in", "Returns, cancellation", action="require_approval")
    assert chat(client, auth, "I need a refund")["action"] == "require_approval"
    assert chat(client, auth, "Please cancel it")["action"] == "require_approval"
    assert chat(client, auth, "What are your store hours?")["action"] != "require_approval"


def test_unknown_field_is_rejected_but_old_rules_still_list(client):
    session = register(client, "rc-field")
    auth = headers(session)
    response = create_rule(client, auth, "ret", "equals", "order_status")
    assert response.status_code == 422
    assert "Unknown field" in response.text
    # A rule saved before this check existed must not break the rules page.
    with SessionLocal() as db:
        org = db.query(Organization).filter_by(slug="rc-field").one()
        db.add(
            CompanyRule(
                organization_id=org.id,
                name="legacy",
                conditions_json=[{"field": "ret", "operator": "equals", "value": "x"}],
                logic="all",
                action_json={"type": "escalate"},
                priority=10,
                enabled=False,
            )
        )
        db.commit()
    listed = client.get("/api/v1/rules", headers=auth)
    assert listed.status_code == 200 and listed.json()[0]["name"] == "legacy"


def test_disabled_rule_can_be_enabled_again(client):
    auth = headers(register(client, "rc-enable"))
    rule = create_rule(client, auth, "message", "contains", "lawyer").json()
    client.delete(f"/api/v1/rules/{rule['id']}", headers=auth)
    assert chat(client, auth, "I will call my lawyer")["action"] != "escalate"
    payload = {k: rule[k] for k in ("name", "conditions", "logic", "action", "priority")} | {"enabled": True}
    assert client.patch(f"/api/v1/rules/{rule['id']}", headers=auth, json=payload).status_code == 200
    assert chat(client, auth, "I will call my lawyer")["action"] == "escalate"


def test_set_priority_does_not_block_and_applies_to_the_ticket(client):
    auth = headers(register(client, "rc-priority"))
    create_rule(client, auth, "intent", "equals", "damaged_item", action="set_priority", rule_priority=1, priority="urgent")
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()["id"]
    url = f"/api/v1/chat/conversations/{conversation}/messages"
    first = client.post(url, headers=auth, json={"content": "My lamp arrived damaged"}).json()
    # The workflow continued past the rule (no documents, so a review is offered).
    assert first["rule_name"] == "intent equals damaged_item"
    assert first["human_review_offered"] is True
    ticket_id = client.post(url, headers=auth, json={"content": "yes"}).json()["ticket_id"]
    assert client.get(f"/api/v1/tickets/{ticket_id}", headers=auth).json()["priority"] == "urgent"


def test_rule_options_list_fields_and_intents(client):
    auth = headers(register(client, "rc-options"))
    options = client.get("/api/v1/rules/options", headers=auth).json()
    assert "entities.order_id" in options["fields"]
    assert {"order_status", "damaged_item", "returns", "cancellation"} <= set(options["intents"])
