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


FLOW = {
    "flow": {
        "version": 1,
        "initial_state": "start",
        "states": {
            "start": {
                "prompt": "Choose an option.",
                "options": {
                    "1": {"label": "Order status", "next_state": "order"},
                    "2": {"label": "Returns", "next_state": "returns"},
                },
            },
            "order": {"prompt": "Please provide your order ID.", "options": {}},
            "returns": {"prompt": "Tell me about your return.", "options": {}},
        },
    }
}


def test_admin_can_save_and_read_tenant_flow(client):
    session = register(client, "flow-a", "flow-a@example.com")
    auth = headers(session)
    saved = client.put("/api/v1/flows/current", headers=auth, json=FLOW)
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    current = client.get("/api/v1/flows/current", headers=auth)
    assert current.status_code == 200
    assert current.json()["flow"]["initial_state"] == "start"


def test_menu_transition_and_global_intent_are_deterministic(client):
    session = register(client, "flow-b", "flow-b@example.com")
    auth = headers(session)
    client.put("/api/v1/flows/current", headers=auth, json=FLOW)
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()

    transition = client.post(
        f"/api/v1/chat/conversations/{conversation['id']}/messages",
        headers=auth,
        json={"content": "1"},
    )
    assert transition.status_code == 200
    assert transition.json()["intent"] == "menu_selection"
    assert transition.json()["current_state"] == "order"
    assert transition.json()["action"] == "flow"
    assert transition.json()["fallback"] is False

    escalation = client.post(
        f"/api/v1/chat/conversations/{conversation['id']}/messages",
        headers=auth,
        json={"content": "I want to talk to a human"},
    )
    assert escalation.status_code == 200
    assert escalation.json()["intent"] == "talk_to_agent"
    assert escalation.json()["action"] == "escalate"
    assert escalation.json()["escalation_offered"] is True


def test_invalid_flow_transition_is_rejected(client):
    session = register(client, "flow-c", "flow-c@example.com")
    response = client.put(
        "/api/v1/flows/current",
        headers=headers(session),
        json={
            "flow": {
                "version": 1,
                "initial_state": "start",
                "states": {
                    "start": {
                        "prompt": "Choose.",
                        "options": {
                            "1": {"label": "Broken", "next_state": "missing"}
                        },
                    }
                },
            }
        },
    )
    assert response.status_code == 422


def test_order_id_is_extracted_and_invalid_order_request_is_handled(client):
    session = register(client, "flow-d", "flow-d@example.com")
    auth = headers(session)
    client.put("/api/v1/flows/current", headers=auth, json=FLOW)
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()
    response = client.post(
        f"/api/v1/chat/conversations/{conversation['id']}/messages",
        headers=auth,
        json={"content": "What is my order status?"},
    )
    assert response.json()["intent"] == "order_status"
    assert "valid order ID" in response.json()["answer"]
