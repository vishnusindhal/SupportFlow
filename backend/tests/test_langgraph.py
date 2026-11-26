"""Tests for the LangChain retriever and the LangGraph support workflow."""

from langchain_core.embeddings import Embeddings

from app.db.session import SessionLocal
from app.models import Organization
from app.services.ai.graph import support_graph
from app.services.ai.retriever import TenantHybridRetriever


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


def upload(client, auth, content, name="policy.txt"):
    return client.post(
        "/api/v1/knowledge/documents", headers=auth, files={"file": (name, content.encode(), "text/plain")}
    )


def new_conversation(client, auth):
    return client.post("/api/v1/chat/conversations", headers=auth, json={}).json()["id"]


def send(client, auth, conversation_id, content):
    return client.post(
        f"/api/v1/chat/conversations/{conversation_id}/messages", headers=auth, json={"content": content}
    ).json()


class ConceptEmbeddings(Embeddings):
    """Semantic stand-in: texts about store locations share one direction."""

    model_name = "test-concept-embeddings"
    similarity_floor = 0.0
    semantic_weight = 0.5

    def _vector(self, text):
        lowered = text.lower()
        about_locations = any(word in lowered for word in ("pune", "mumbai", "where", "located", "visit"))
        return [1.0, 0.0] + [0.0] * 382 if about_locations else [0.0, 1.0] + [0.0] * 382

    def embed_documents(self, texts):
        return [self._vector(text) for text in texts]

    def embed_query(self, text):
        return self._vector(text)


def test_graph_contains_the_documented_workflow():
    nodes = set(support_graph.get_graph().nodes)
    assert {
        "load_context",
        "review_reply",
        "detect_intent",
        "evaluate_rules",
        "rule_action",
        "flow_reply",
        "escalate",
        "condense_question",
        "retrieve",
        "generate",
        "offer_human_review",
        "persist",
    } <= nodes


def test_semantic_match_without_shared_words(client, fake_chains, monkeypatch):
    concept = ConceptEmbeddings()
    monkeypatch.setattr("app.api.routes.knowledge.get_embeddings", lambda: concept)
    monkeypatch.setattr("app.services.ai.graph.get_embeddings", lambda: concept)
    chains = fake_chains(answer="Our shops are in Pune and Mumbai.")
    auth = headers(register(client, "lg-semantic"))
    upload(client, auth, "Our shops are in Pune and Mumbai.", name="stores.txt")
    upload(client, auth, "Refunds are issued within five business days.", name="refunds.txt")
    # No meaningful word is shared with the stores document.
    body = send(client, auth, new_conversation(client, auth), "Where are you located?")
    assert body["fallback"] is False
    assert [s["document_name"] for s in body["sources"]] == ["stores.txt"]
    assert "Pune" in chains.answer_calls[-1]["evidence"]


def test_retriever_only_returns_the_tenants_chunks(client):
    first = headers(register(client, "lg-tenant-a"))
    second = headers(register(client, "lg-tenant-b"))
    upload(client, first, "Zircon plan costs 40 dollars.")
    upload(client, second, "Zircon plan costs 99 dollars.")
    with SessionLocal() as db:
        org = db.query(Organization).filter_by(slug="lg-tenant-a").one()
        from app.services.ai.llm import HashEmbeddings

        documents = TenantHybridRetriever(db=db, organization_id=org.id, embeddings=HashEmbeddings()).invoke(
            "Zircon plan price"
        )
    assert documents and all("40 dollars" in doc.page_content for doc in documents)


def test_rules_run_before_any_model_call(client, fake_chains):
    chains = fake_chains()
    auth = headers(register(client, "lg-rules"))
    upload(client, auth, "Damaged items can be replaced within seven days.")
    client.post(
        "/api/v1/rules",
        headers=auth,
        json={
            "name": "Damaged",
            "conditions": [{"field": "message", "operator": "contains", "value": "damaged"}],
            "logic": "all",
            "action": {"type": "escalate", "message": "A specialist will contact you."},
            "priority": 1,
            "enabled": True,
        },
    )
    body = send(client, auth, new_conversation(client, auth), "My lamp arrived damaged")
    assert body["action"] == "escalate" and body["ticket_id"]
    assert chains.condense_calls == [] and chains.answer_calls == []


def test_provider_failure_in_generate_offers_human_review(client, fake_chains):
    fake_chains(fail=True)
    auth = headers(register(client, "lg-fail"))
    upload(client, auth, "Express shipping costs 12.99 USD.")
    body = send(client, auth, new_conversation(client, auth), "How much is express shipping?")
    assert body["fallback"] is True
    assert "provider is not available" in body["answer"].lower()
    assert body["human_review_offered"] is True
    assert body["sources"]


def test_condense_failure_falls_back_to_the_original_question(client, fake_chains):
    chains = fake_chains()

    async def broken(question, history):
        raise RuntimeError("provider down")

    chains.condense = broken
    auth = headers(register(client, "lg-condense"))
    upload(client, auth, "Express shipping costs 12.99 USD.")
    conversation = new_conversation(client, auth)
    send(client, auth, conversation, "How much is express shipping?")
    body = send(client, auth, conversation, "Is express shipping available everywhere?")
    assert body["fallback"] is False
    assert chains.answer_calls[-1]["standalone_question"] == "Is express shipping available everywhere?"


def test_fake_chains_match_the_real_chain_interface():
    import inspect

    from app.services.ai.chains import SupportChains
    from tests.conftest import FakeChains

    for name in ("condense", "answer"):
        real = list(inspect.signature(getattr(SupportChains, name)).parameters)
        fake = list(inspect.signature(getattr(FakeChains, name)).parameters)
        assert real == fake, f"{name}: {real} != {fake}"
