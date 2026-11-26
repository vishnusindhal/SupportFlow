from app.services.memory import is_affirmative, is_negative


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


def upload(client, auth, content, name="policy.txt"):
    return client.post(
        "/api/v1/knowledge/documents",
        headers=auth,
        files={"file": (name, content.encode(), "text/plain")},
    )


def send(client, auth, conversation_id, content):
    return client.post(
        f"/api/v1/chat/conversations/{conversation_id}/messages",
        headers=auth,
        json={"content": content},
    )


def test_memory_helpers():
    assert is_affirmative("Yes please!") and is_affirmative("ok")
    assert is_negative("No thanks") and not is_negative("not sure what to do")


def test_follow_up_question_is_rewritten_with_conversation_memory(client, fake_chains):
    chains = fake_chains(rewrites={"Which framework does it use?": "Which framework does Eventopia use?"})
    auth = headers(register(client, "mem-a", "mem-a@example.com"))
    upload(client, auth, "Eventopia is a campus event discovery platform built with React and FastAPI.")
    upload(client, auth, "Northstar ships orders within five business days.", name="shipping.txt")
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()

    first = send(client, auth, conversation["id"], "What is Eventopia?")
    assert first.status_code == 200
    assert first.json()["fallback"] is False
    # No history yet, so the rewrite step is skipped.
    assert chains.condense_calls == []

    second = send(client, auth, conversation["id"], "Which framework does it use?")
    assert second.status_code == 200
    body = second.json()
    assert body["fallback"] is False
    assert body["sources"][0]["document_name"] == "policy.txt"
    # condense_question received the earlier turns as memory.
    assert chains.condense_calls[-1]["history"] == [("human", "What is Eventopia?"), ("ai", "Grounded answer.")]
    # Retrieval and the answer used the standalone question.
    assert chains.answer_calls[-1]["standalone_question"] == "Which framework does Eventopia use?"
    assert "Eventopia is a campus event discovery platform" in chains.answer_calls[-1]["evidence"]


def test_order_id_is_remembered_across_turns(client, fake_chains):
    fake_chains()
    auth = headers(register(client, "mem-b", "mem-b@example.com"))
    client.put(
        "/api/v1/flows/current",
        headers=auth,
        json={
            "flow": {
                "version": 1,
                "initial_state": "start",
                "states": {"start": {"prompt": "How can I help?", "options": {}}},
            }
        },
    )
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()
    send(client, auth, conversation["id"], "Where is my order ORD-1234?")
    # Created after the first turn, so it can only match the remembered entity.
    client.post(
        "/api/v1/rules",
        headers=auth,
        json={
            "name": "Known order",
            "conditions": [{"field": "entities.order_id", "operator": "equals", "value": "ORD-1234"}],
            "logic": "all",
            "action": {"type": "auto_respond", "message": "Order ORD-1234 ships tomorrow."},
            "priority": 1,
            "enabled": True,
        },
    )
    follow_up = send(client, auth, conversation["id"], "When will my order arrive?")
    assert follow_up.status_code == 200
    # Without memory this would ask for the order ID again.
    assert follow_up.json()["answer"] == "Order ORD-1234 ships tomorrow."


def test_unknown_question_offers_human_review_and_yes_creates_ticket(client):
    auth = headers(register(client, "mem-c", "mem-c@example.com"))
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()

    unknown = send(client, auth, conversation["id"], "Do you sell gift cards?")
    body = unknown.json()
    assert body["fallback"] is True
    assert body["human_review_offered"] is True
    assert "human review" in body["answer"].lower()
    assert body["ticket_id"] is None

    accepted = send(client, auth, conversation["id"], "yes")
    body = accepted.json()
    assert accepted.status_code == 200
    assert body["action"] == "human_review_created"
    assert body["ticket_id"]

    tickets = client.get("/api/v1/tickets", headers=auth).json()
    assert len(tickets) == 1
    assert tickets[0]["id"] == body["ticket_id"]
    assert tickets[0]["conversation_id"] == conversation["id"]
    assert "gift cards" in tickets[0]["title"]
    assert tickets[0]["metadata"]["source"] == "chat_human_review"

    # A later unanswered question points to the open ticket instead of re-offering.
    again = send(client, auth, conversation["id"], "Do you ship to Mars?").json()
    assert again["human_review_offered"] is False
    assert "already open" in again["answer"]


def test_declining_human_review_creates_no_ticket(client):
    auth = headers(register(client, "mem-d", "mem-d@example.com"))
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()
    send(client, auth, conversation["id"], "Do you sell gift cards?")
    declined = send(client, auth, conversation["id"], "no thanks").json()
    assert declined["action"] == "human_review_declined"
    assert declined["ticket_id"] is None
    assert client.get("/api/v1/tickets", headers=auth).json() == []


def test_unrelated_message_dismisses_pending_offer(client):
    auth = headers(register(client, "mem-e", "mem-e@example.com"))
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()
    send(client, auth, conversation["id"], "Do you sell gift cards?")
    send(client, auth, conversation["id"], "What are your store hours today?")
    # The offer was replaced by the new one, so "yes" now refers to the latest question.
    accepted = send(client, auth, conversation["id"], "yes").json()
    tickets = client.get("/api/v1/tickets", headers=auth).json()
    assert accepted["action"] == "human_review_created"
    assert "store hours" in tickets[0]["title"]


def test_model_no_answer_offers_human_review(client, fake_chains):
    fake_chains(answer="The evidence does not say.", answerable=False)
    auth = headers(register(client, "mem-f", "mem-f@example.com"))
    upload(client, auth, "Northstar returns are accepted within 30 days.")
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()
    body = send(client, auth, conversation["id"], "Are returns accepted for opened software?").json()
    assert body["fallback"] is True
    assert body["human_review_offered"] is True
    assert "could not find enough company information" in body["answer"]


def test_talk_to_agent_escalates_without_a_configured_flow(client):
    auth = headers(register(client, "mem-g", "mem-g@example.com"))
    conversation = client.post("/api/v1/chat/conversations", headers=auth, json={}).json()
    body = send(client, auth, conversation["id"], "I want to talk to an agent").json()
    assert body["intent"] == "talk_to_agent"
    assert body["action"] == "escalate"
    assert body["ticket_id"]
    assert body["human_review_offered"] is False


def test_phrase_match_breaks_ties_between_chunks():
    from app.services.knowledge import lexical_score

    question = "Which cities have Northstar physical stores?"
    stores = "Northstar Store FAQ. Northstar has physical stores in Pune, Bengaluru and Mumbai."
    warranty = "Northstar Store warranty. Physical damage and water damage are not covered."
    assert lexical_score(question, stores) > lexical_score(question, warranty)
    assert lexical_score(question, stores) <= 1
