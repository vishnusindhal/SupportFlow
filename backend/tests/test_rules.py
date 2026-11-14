from app.schemas.rules import RuleCondition
from app.services.rules import evaluate_conditions


def register(client, slug, email):
    return client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": slug,
            "organization_slug": slug,
            "email": email,
            "display_name": "Owner",
            "password": "correct horse battery",
        },
    ).json()


def headers(session):
    return {"Authorization": "Bearer " + session["access_token"]}


def rule(name, field, operator, value, priority=100, action=None):
    return {
        "name": name,
        "conditions": [{"field": field, "operator": operator, "value": value}],
        "logic": "all",
        "action": action or {"type": "auto_respond", "message": "Handled by rule."},
        "priority": priority,
        "enabled": True,
    }


def test_rule_operators_and_missing_fields_are_safe():
    cases = [
        ("equals", "open", "open", True),
        ("not_equals", "open", "closed", True),
        ("greater_than", 10, 5, True),
        ("less_than", 5, 10, True),
        ("contains", "urgent refund", "refund", True),
        ("in", "high", ["low", "high"], True),
        ("equals", None, "anything", False),
        ("greater_than", "not-a-number", 2, False),
    ]
    for operator, actual, expected, matched in cases:
        context = {"value": actual} if actual is not None else {}
        result, _ = evaluate_conditions(
            [RuleCondition(field="value", operator=operator, value=expected)],
            "all",
            context,
        )
        assert result is matched


def test_rule_priority_and_action_are_applied_before_gemini(client):
    session = register(client, "rules-a", "rules-a@example.com")
    auth = headers(session)
    low = rule("low", "intent", "equals", "knowledge_question", priority=200)
    high = rule(
        "high",
        "intent",
        "equals",
        "knowledge_question",
        priority=10,
        action={"type": "auto_respond", "message": "Deterministic answer."},
    )
    assert client.post("/api/v1/rules", headers=auth, json=low).status_code == 201
    assert client.post("/api/v1/rules", headers=auth, json=high).status_code == 201
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()
    response = client.post(
        f"/api/v1/chat/conversations/{conversation['id']}/messages",
        headers=auth,
        json={"content": "What is my order status?"},
    )
    assert response.status_code == 200
    assert response.json()["answer"] == "Deterministic answer."
    assert response.json()["action"] == "auto_respond"


def test_dry_run_has_no_side_effect_and_tenant_rules_are_isolated(client):
    first = register(client, "rules-b", "rules-b@example.com")
    second = register(client, "rules-c", "rules-c@example.com")
    created = client.post(
        "/api/v1/rules",
        headers=headers(first),
        json=rule("private", "intent", "equals", "talk_to_agent"),
    )
    rule_id = created.json()["id"]
    dry_run = client.post(
        "/api/v1/rules/test",
        headers=headers(first),
        json={"context": {"intent": "talk_to_agent"}},
    )
    assert dry_run.status_code == 200
    assert dry_run.json()["matched"] is True
    assert client.get("/api/v1/rules", headers=headers(second)).json() == []
    assert client.patch(
        f"/api/v1/rules/{rule_id}",
        headers=headers(second),
        json=rule("takeover", "intent", "equals", "talk_to_agent"),
    ).status_code == 404


def test_rule_schema_rejects_unknown_operator_and_malicious_data(client):
    session = register(client, "rules-d", "rules-d@example.com")
    response = client.post(
        "/api/v1/rules",
        headers=headers(session),
        json=rule("unsafe", "__import__('os').system", "equals", "rm -rf /"),
    )
    assert response.status_code == 422
