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


def test_create_and_get_ticket(client):
    owner = register(client, "org-tickets", "owner@tickets.example")
    h = headers(owner)

    create_res = client.post(
        "/api/v1/tickets",
        headers=h,
        json={
            "title": "Damaged jacket received",
            "description": "Customer reported torn sleeve on order ORD-9921",
            "priority": "high",
            "team": "returns",
            "customer_email": "customer@example.com",
            "metadata": {"order_id": "ORD-9921"},
        },
    )
    assert create_res.status_code == 201
    ticket = create_res.json()
    assert ticket["title"] == "Damaged jacket received"
    assert ticket["status"] == "open"
    assert ticket["priority"] == "high"
    assert ticket["team"] == "returns"
    assert ticket["customer_email"] == "customer@example.com"
    assert ticket["metadata"]["order_id"] == "ORD-9921"

    get_res = client.get(f"/api/v1/tickets/{ticket['id']}", headers=h)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == ticket["id"]


def test_list_tickets_and_filtering(client):
    owner = register(client, "org-list-tickets", "owner@listtickets.example")
    h = headers(owner)

    client.post(
        "/api/v1/tickets",
        headers=h,
        json={"title": "Ticket 1", "description": "desc 1", "priority": "low"},
    )
    t2 = client.post(
        "/api/v1/tickets",
        headers=h,
        json={"title": "Ticket 2", "description": "desc 2", "priority": "urgent", "team": "billing"},
    ).json()

    # List all
    all_res = client.get("/api/v1/tickets", headers=h)
    assert all_res.status_code == 200
    assert len(all_res.json()) == 2

    # Filter by priority
    urgent_res = client.get("/api/v1/tickets?priority=urgent", headers=h)
    assert urgent_res.status_code == 200
    assert len(urgent_res.json()) == 1
    assert urgent_res.json()[0]["id"] == t2["id"]

    # Filter by team
    billing_res = client.get("/api/v1/tickets?team=billing", headers=h)
    assert billing_res.status_code == 200
    assert len(billing_res.json()) == 1


def test_update_ticket_status_and_resolution(client):
    owner = register(client, "org-update-tickets", "owner@updatetickets.example")
    h = headers(owner)

    ticket = client.post(
        "/api/v1/tickets",
        headers=h,
        json={"title": "Pending question", "description": "Needs agent answer", "priority": "normal"},
    ).json()
    assert ticket["resolved_at"] is None

    # Update to in_progress
    update_res = client.patch(
        f"/api/v1/tickets/{ticket['id']}",
        headers=h,
        json={"status": "in_progress", "priority": "high"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "in_progress"
    assert updated["priority"] == "high"

    # Resolve ticket
    resolve_res = client.patch(
        f"/api/v1/tickets/{ticket['id']}",
        headers=h,
        json={"status": "resolved"},
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"
    assert resolve_res.json()["resolved_at"] is not None


def test_ticket_comments_and_internal_notes(client):
    owner = register(client, "org-comments", "owner@comments.example")
    h = headers(owner)

    ticket = client.post(
        "/api/v1/tickets",
        headers=h,
        json={"title": "Feedback ticket", "description": "Customer feedback"},
    ).json()

    # Add public comment
    c1 = client.post(
        f"/api/v1/tickets/{ticket['id']}/comments",
        headers=h,
        json={"content": "We have received your request.", "is_internal": False},
    )
    assert c1.status_code == 201
    assert c1.json()["content"] == "We have received your request."
    assert c1.json()["is_internal"] is False

    # Add internal note
    c2 = client.post(
        f"/api/v1/tickets/{ticket['id']}/comments",
        headers=h,
        json={"content": "Checked inventory, replacement available.", "is_internal": True},
    )
    assert c2.status_code == 201
    assert c2.json()["is_internal"] is True

    # List comments
    comments_res = client.get(f"/api/v1/tickets/{ticket['id']}/comments", headers=h)
    assert comments_res.status_code == 200
    comments = comments_res.json()
    assert len(comments) == 2
    assert comments[0]["content"] == "We have received your request."
    assert comments[1]["is_internal"] is True


def test_ticket_strict_tenant_isolation(client):
    owner_a = register(client, "tenant-a", "a@example.com")
    owner_b = register(client, "tenant-b", "b@example.com")

    t_a = client.post(
        "/api/v1/tickets",
        headers=headers(owner_a),
        json={"title": "Secret issue A", "description": "Confidential data"},
    ).json()

    # Tenant B cannot get Ticket A
    get_res = client.get(f"/api/v1/tickets/{t_a['id']}", headers=headers(owner_b))
    assert get_res.status_code == 404

    # Tenant B list does not contain Ticket A
    list_res = client.get("/api/v1/tickets", headers=headers(owner_b))
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

    # Tenant B cannot patch Ticket A
    patch_res = client.patch(
        f"/api/v1/tickets/{t_a['id']}",
        headers=headers(owner_b),
        json={"status": "resolved"},
    )
    assert patch_res.status_code == 404

    # Tenant B cannot comment on Ticket A
    comment_res = client.post(
        f"/api/v1/tickets/{t_a['id']}/comments",
        headers=headers(owner_b),
        json={"content": "Malicious comment"},
    )
    assert comment_res.status_code == 404


def test_chat_rule_escalation_automatically_creates_ticket(client):
    owner = register(client, "org-auto-ticket", "auto@ticket.example")
    h = headers(owner)

    # Create an escalation rule: when intent equals damaged_item -> escalate
    rule_res = client.post(
        "/api/v1/rules",
        headers=h,
        json={
            "name": "Damaged item rule",
            "conditions": [{"field": "intent", "operator": "equals", "value": "damaged_item"}],
            "logic": "all",
            "action": {"type": "escalate", "message": "An agent will contact you shortly.", "priority": "urgent"},
            "priority": 10,
            "enabled": True,
        },
    )
    assert rule_res.status_code == 201

    # Configure a flow that recognizes damaged_item or menu
    flow = {
        "version": 1,
        "initial_state": "start",
        "states": {
            "start": {
                "prompt": "Welcome",
                "options": {
                    "1": {"label": "Damaged Item", "next_state": "damaged_state"},
                },
            },
            "damaged_state": {
                "prompt": "Please describe damage",
                "options": {},
                "terminal": True,
            },
        },
    }
    client.put("/api/v1/flows/current", headers=h, json={"flow": flow})

    # Start conversation
    conv_res = client.post("/api/v1/chat/conversations", headers=h, json={"channel": "widget"})
    assert conv_res.status_code == 201
    conv = conv_res.json()

    # Verify no tickets initially
    tickets_before = client.get("/api/v1/tickets", headers=h).json()
    assert len(tickets_before) == 0

    # Send message matching rule intent (via talk to agent global intent or menu)
    chat_res = client.post(
        f"/api/v1/chat/conversations/{conv['id']}/messages",
        headers=h,
        json={"content": "talk to an agent"},
    )
    assert chat_res.status_code == 200
    assert chat_res.json()["escalation_offered"] is True

    # Verify ticket was automatically created in database
    tickets_after = client.get("/api/v1/tickets", headers=h).json()
    assert len(tickets_after) == 1
    created_ticket = tickets_after[0]
    assert created_ticket["conversation_id"] == conv["id"]
    assert created_ticket["status"] == "open"
    assert "talk to an agent" in created_ticket["description"].lower()
    assert created_ticket["metadata"]["intent"] == "talk_to_agent"
