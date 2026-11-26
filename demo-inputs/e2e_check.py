"""End-to-end check of every SupportFlow feature against a running backend.

Usage (backend must be running, e.g. `docker compose up` or uvicorn):
    python demo-inputs/e2e_check.py [http://localhost:8000]

It registers fresh demo organizations, uploads every file in this folder and
exercises auth, onboarding, knowledge, retrieval, grounded Gemini chat, memory,
human review, flows, rules, tickets and tenant isolation. Each check prints
PASS / FAIL; Gemini answers are printed so you can read them.
"""

import sys
import time
from pathlib import Path

import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
API = f"{BASE}/api/v1"
HERE = Path(__file__).resolve().parent
MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".csv": "text/csv",
}
results: list[tuple[str, bool]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, bool(ok)))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f"  -> {detail}" if detail and not ok else ""))
    return bool(ok)


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def show(label: str, text: str) -> None:
    print(f"      {label}: {' '.join(text.split())[:300]}")


def register(client: httpx.Client, slug: str) -> dict:
    res = client.post(
        f"{API}/auth/register",
        json={
            "organization_name": slug.replace("-", " ").title(),
            "organization_slug": slug,
            "email": f"owner@{slug}.example",
            "display_name": "Demo Owner",
            "password": "correct horse battery",
        },
    )
    check(f"register {slug}", res.status_code == 201, res.text)
    return res.json()


def main() -> int:
    run = str(int(time.time()))
    client = httpx.Client(timeout=90)
    other = httpx.Client(timeout=90)

    section("Health")
    check("GET /health", client.get(f"{BASE}/health").json() == {"status": "ok"})

    section("Authentication and tenancy (V1)")
    session = register(client, f"northstar-{run}")
    auth = {"Authorization": f"Bearer {session['access_token']}"}
    me = client.get(f"{API}/auth/me", headers=auth)
    check("GET /auth/me", me.status_code == 200, me.text)
    check("GET /organizations/current", client.get(f"{API}/organizations/current", headers=auth).status_code == 200)
    login = client.post(
        f"{API}/auth/login",
        json={"email": f"owner@northstar-{run}.example", "password": "correct horse battery"},
    )
    check("login with correct password", login.status_code == 200, login.text)
    bad = client.post(f"{API}/auth/login", json={"email": f"owner@northstar-{run}.example", "password": "wrong password!"})
    check("login with wrong password rejected", bad.status_code == 401, bad.text)
    old_cookie = client.cookies.get("refresh_token") or next(iter(client.cookies.values()), None)
    refreshed = client.post(f"{API}/auth/refresh")
    check("refresh token rotation", refreshed.status_code == 200, refreshed.text)
    if old_cookie:
        reuse = httpx.post(f"{API}/auth/refresh", cookies={c.name: old_cookie for c in client.cookies.jar})
        check("reused refresh token rejected", reuse.status_code == 401, reuse.text)
    auth = {"Authorization": f"Bearer {refreshed.json()['access_token']}"}
    check("protected route without token rejected", client.get(f"{API}/auth/me").status_code == 401)

    section("Templates and onboarding (V2)")
    templates = client.get(f"{API}/templates").json()
    check("active template available", len(templates) >= 1, str(templates))
    template_id = templates[0]["id"]
    check("template detail", client.get(f"{API}/templates/{template_id}").status_code == 200)
    profile = client.put(
        f"{API}/onboarding/profile", headers=auth, json={"company_name": "Northstar Store", "timezone": "Asia/Kolkata"}
    )
    check("save company profile", profile.status_code == 200, profile.text)
    done = client.post(f"{API}/onboarding/complete", headers=auth, json={"template_id": template_id})
    check("complete onboarding", done.status_code == 201, done.text)
    again = client.post(f"{API}/onboarding/complete", headers=auth, json={"template_id": template_id})
    check("duplicate onboarding rejected", again.status_code == 409, again.text)
    check("onboarding status completed", client.get(f"{API}/onboarding/status", headers=auth).json()["completed"] is True)
    check("configuration snapshot", client.get(f"{API}/configuration/current", headers=auth).status_code == 200)

    section("Knowledge upload: every demo file (V3)")
    documents: dict[str, dict] = {}
    for path in sorted(HERE.iterdir()):
        if path.suffix not in MIME:
            continue
        res = client.post(
            f"{API}/knowledge/documents",
            headers=auth,
            files={"file": (path.name, path.read_bytes(), MIME[path.suffix])},
        )
        if path.suffix == ".csv":
            check(f"unsupported {path.name} rejected", res.status_code == 400, res.text)
            continue
        body = res.json() if res.status_code < 500 else {}
        ok = res.status_code == 201 and body.get("status") == "ready"
        check(f"upload + process {path.name}", ok, res.text)
        documents[path.name] = body
    listed = client.get(f"{API}/knowledge/documents", headers=auth).json()
    check("document list shows 6 ready documents", sum(d["status"] == "ready" for d in listed) == 6, str(listed))
    first_id = next(iter(documents.values()))["id"]
    check("get document by id", client.get(f"{API}/knowledge/documents/{first_id}", headers=auth).status_code == 200)

    section("Retrieval and ranking (V3)")
    retrieval_cases = [
        ("express shipping cost metro cities", "01-shipping-and-delivery-policy.pdf"),
        ("non-returnable gift cards perishable personalized", "02-returns-refunds-and-cancellations.pdf"),
        ("AuroraBeam Smart Lamp warranty LED panel", "03-product-warranty-guide.pdf"),
        ("Northstar Rewards Gold tier points", "04-payments-and-rewards-program.pdf"),
        ("physical stores Pune Bengaluru Mumbai", "05-store-locations-faq.docx"),
        ("tracking not updated courier investigation", "06-order-tracking-guide.txt"),
    ]
    for query, expected in retrieval_cases:
        hits = client.post(f"{API}/knowledge/retrieve", headers=auth, json={"query": query, "top_k": 3}).json()
        top = hits[0]["metadata"].get("source_filename") if hits else None
        check(f"'{query}' -> {expected}", top == expected, f"top hit was {top}")

    section("Retry and delete")
    retry = client.post(f"{API}/knowledge/documents/{first_id}/retry", headers=auth)
    check("retry processing", retry.status_code == 200 and retry.json().get("status") == "ready", retry.text)
    temp = client.post(
        f"{API}/knowledge/documents",
        headers=auth,
        files={"file": ("temp.txt", b"Zephyrion is a temporary codeword for the delete test.", "text/plain")},
    ).json()
    deleted = client.delete(f"{API}/knowledge/documents/{temp['id']}", headers=auth)
    hits = client.post(f"{API}/knowledge/retrieve", headers=auth, json={"query": "Zephyrion codeword"}).json()
    check("delete removes document from search",
          deleted.status_code == 204 and all("Zephyrion" not in h["content"] for h in hits))

    section("Grounded Gemini chat, one question per document (V4)")
    gemini_ok = True
    chat_cases = [
        ("How much does express shipping cost?", "01-shipping-and-delivery-policy.pdf", ["12.99"]),
        ("Can I return a gift card?", "02-returns-refunds-and-cancellations.pdf", ["gift card"]),
        ("What warranty does the AuroraBeam Smart Lamp have?", "03-product-warranty-guide.pdf", ["two", "2"]),
        ("How many points do I need for a 10 USD voucher?", "04-payments-and-rewards-program.pdf", ["500"]),
        ("Which cities have Northstar physical stores?", "05-store-locations-faq.docx", ["Pune"]),
        ("What should I do if tracking has not updated?", "06-order-tracking-guide.txt", ["order ID", "support"]),
    ]
    for question, expected_doc, keywords in chat_cases:
        conversation = client.post(f"{API}/chat/conversations", headers=auth, json={}).json()
        body = client.post(
            f"{API}/chat/conversations/{conversation['id']}/messages", headers=auth, json={"content": question}
        ).json()
        docs = [s["document_name"] for s in body.get("sources", [])]
        answered = body.get("fallback") is False
        gemini_ok &= answered
        check(f"answered from {expected_doc}", answered and expected_doc in docs, f"fallback={body.get('fallback')} sources={docs} answer={body.get('answer')}")
        check("  answer mentions expected fact", any(k.lower() in body.get("answer", "").lower() for k in keywords), body.get("answer", ""))
        show("Q", question)
        show("A", body.get("answer", ""))

    section("Conversation memory (follow-up questions)")
    conversation = client.post(f"{API}/chat/conversations", headers=auth, json={}).json()
    url = f"{API}/chat/conversations/{conversation['id']}/messages"
    turns = [
        ("What warranty do the SonicWave Earbuds have?", "03-product-warranty-guide.pdf", ["one", "1"]),
        ("Is the battery covered too?", "03-product-warranty-guide.pdf", ["six", "6"]),
        ("How much does express shipping cost?", "01-shipping-and-delivery-policy.pdf", ["12.99"]),
        ("How long does it take to arrive?", "01-shipping-and-delivery-policy.pdf", ["one to two", "1-2", "1 to 2", "1–2", "two business"]),
    ]
    for question, expected_doc, keywords in turns:
        body = client.post(url, headers=auth, json={"content": question}).json()
        docs = [s["document_name"] for s in body.get("sources", [])]
        check(f"'{question}' uses {expected_doc}", expected_doc in docs, f"sources={docs}")
        check("  answer resolves the reference", any(k.lower() in body.get("answer", "").lower() for k in keywords), body.get("answer", ""))
        show("Q", question)
        show("A", body.get("answer", ""))
    history = client.get(url, headers=auth).json()
    check("conversation history persisted (8 messages)", len(history) == 8, str(len(history)))

    section("Human review when the bot does not know")
    conversation = client.post(f"{API}/chat/conversations", headers=auth, json={}).json()
    url = f"{API}/chat/conversations/{conversation['id']}/messages"
    unknown = client.post(url, headers=auth, json={"content": "Do you offer student discounts?"}).json()
    show("A", unknown.get("answer", ""))
    check("unknown question offers human review", unknown.get("human_review_offered") is True, unknown.get("answer", ""))
    accepted = client.post(url, headers=auth, json={"content": "yes"}).json()
    show("A", accepted.get("answer", ""))
    check("'yes' creates a human review ticket", bool(accepted.get("ticket_id")), str(accepted))
    review_ticket = client.get(f"{API}/tickets/{accepted.get('ticket_id')}", headers=auth).json()
    check("ticket stores the question", "student discounts" in review_ticket.get("title", ""), str(review_ticket))
    conversation = client.post(f"{API}/chat/conversations", headers=auth, json={}).json()
    url = f"{API}/chat/conversations/{conversation['id']}/messages"
    client.post(url, headers=auth, json={"content": "Do you sell pet food?"})
    declined = client.post(url, headers=auth, json={"content": "no thanks"}).json()
    check("'no' declines without a ticket", declined.get("action") == "human_review_declined" and not declined.get("ticket_id"))

    section("Conversation flows (V5)")
    flow = {
        "flow": {
            "version": 1,
            "initial_state": "start",
            "states": {
                "start": {
                    "prompt": "Welcome to Northstar! Choose 1 for order status or 2 for returns.",
                    "options": {
                        "1": {"label": "Order status", "next_state": "order"},
                        "2": {"label": "Returns", "next_state": "returns"},
                    },
                },
                "order": {"prompt": "Please share your order ID, for example ORD-1234.", "options": {}},
                "returns": {"prompt": "Tell me which item you want to return.", "options": {}},
            },
        }
    }
    check("save flow", client.put(f"{API}/flows/current", headers=auth, json=flow).status_code == 200)
    check("read flow", client.get(f"{API}/flows/current", headers=auth).json()["flow"]["initial_state"] == "start")
    bad_flow = {"flow": {**flow["flow"], "states": {"start": {"prompt": "x", "options": {"1": {"label": "Bad", "next_state": "missing"}}}}}}
    check("invalid transition rejected", client.put(f"{API}/flows/current", headers=auth, json=bad_flow).status_code == 422)
    conversation = client.post(f"{API}/chat/conversations", headers=auth, json={}).json()
    url = f"{API}/chat/conversations/{conversation['id']}/messages"
    menu = client.post(url, headers=auth, json={"content": "1"}).json()
    check("menu '1' moves to order state", menu.get("current_state") == "order", str(menu))
    helped = client.post(url, headers=auth, json={"content": "help"}).json()
    check("'help' intent", helped.get("intent") == "help", str(helped))
    no_id = client.post(url, headers=auth, json={"content": "Where is my order?"}).json()
    check("order question without ID asks for it", "order ID" in no_id.get("answer", ""), no_id.get("answer", ""))
    restart = client.post(url, headers=auth, json={"content": "restart"}).json()
    check("'restart' returns to start", restart.get("current_state") == "start", str(restart))
    agent = client.post(url, headers=auth, json={"content": "I want to talk to an agent"}).json()
    check("'talk to an agent' escalates with a ticket", agent.get("intent") == "talk_to_agent" and bool(agent.get("ticket_id")), str(agent))

    section("Business rules (V6)")
    rule = {
        "name": "Damaged items go to returns team",
        "conditions": [{"field": "message", "operator": "contains", "value": "damaged"}],
        "logic": "all",
        "action": {"type": "escalate", "message": "Sorry about that! A returns specialist will contact you.", "team": "returns", "priority": "urgent"},
        "priority": 10,
        "enabled": True,
    }
    created = client.post(f"{API}/rules", headers=auth, json=rule)
    check("create rule", created.status_code == 201, created.text)
    rule_id = created.json()["id"]
    check("list rules", len(client.get(f"{API}/rules", headers=auth).json()) == 1)
    dry = client.post(f"{API}/rules/test", headers=auth, json={"context": {"message": "my lamp arrived damaged"}}).json()
    check("dry run matches", dry.get("matched") is True, str(dry))
    malicious = dict(rule, conditions=[{"field": "__import__('os')", "operator": "equals", "value": 1}])
    check("malicious rule field rejected", client.post(f"{API}/rules", headers=auth, json=malicious).status_code == 422)
    conversation = client.post(f"{API}/chat/conversations", headers=auth, json={}).json()
    url = f"{API}/chat/conversations/{conversation['id']}/messages"
    fired = client.post(url, headers=auth, json={"content": "My ChefPro Blender arrived damaged"}).json()
    show("A", fired.get("answer", ""))
    check("rule runs before Gemini and escalates", fired.get("action") == "escalate" and bool(fired.get("ticket_id")), str(fired))
    rule_ticket = client.get(f"{API}/tickets/{fired.get('ticket_id')}", headers=auth).json()
    check("rule ticket is urgent for returns team", rule_ticket.get("priority") == "urgent" and rule_ticket.get("team") == "returns", str(rule_ticket))
    check("disable rule", client.delete(f"{API}/rules/{rule_id}", headers=auth).status_code == 204)
    conversation = client.post(f"{API}/chat/conversations", headers=auth, json={}).json()
    after = client.post(f"{API}/chat/conversations/{conversation['id']}/messages", headers=auth, json={"content": "My lamp arrived damaged"}).json()
    check("disabled rule no longer fires", after.get("action") != "escalate", str(after))

    section("Tickets and human handoff (V7)")
    manual = client.post(f"{API}/tickets", headers=auth, json={"title": "Manual ticket", "description": "Created from the API", "priority": "high"})
    check("create ticket manually", manual.status_code == 201, manual.text)
    tickets = client.get(f"{API}/tickets", headers=auth).json()
    check("ticket list has all tickets (4)", len(tickets) == 4, str(len(tickets)))
    check("filter by priority", all(t["priority"] == "urgent" for t in client.get(f"{API}/tickets?priority=urgent", headers=auth).json()))
    tid = manual.json()["id"]
    progress = client.patch(f"{API}/tickets/{tid}", headers=auth, json={"status": "in_progress"})
    check("mark in progress", progress.json().get("status") == "in_progress", progress.text)
    note = client.post(f"{API}/tickets/{tid}/comments", headers=auth, json={"content": "Checking with courier.", "is_internal": True})
    check("add internal note", note.status_code == 201, note.text)
    check("list comments", len(client.get(f"{API}/tickets/{tid}/comments", headers=auth).json()) == 1)
    resolved = client.patch(f"{API}/tickets/{tid}", headers=auth, json={"status": "resolved"}).json()
    check("resolve sets resolved_at", resolved.get("status") == "resolved" and resolved.get("resolved_at"), str(resolved))

    section("Admin preview endpoint")
    preview = client.post(f"{API}/chat/preview", headers=auth, json={"content": "What payment methods do you accept?"}).json()
    show("A", preview.get("answer", ""))
    check("preview answers", bool(preview.get("answer")), str(preview))

    section("Tenant isolation")
    second = register(other, f"rival-{run}")
    other_auth = {"Authorization": f"Bearer {second['access_token']}"}
    check("other org sees no documents", other.get(f"{API}/knowledge/documents", headers=other_auth).json() == [])
    check("other org retrieval returns nothing", other.post(f"{API}/knowledge/retrieve", headers=other_auth, json={"query": "express shipping"}).json() == [])
    check("other org cannot read ticket", other.get(f"{API}/tickets/{tid}", headers=other_auth).status_code == 404)
    check("other org cannot read conversation", other.get(f"{API}/chat/conversations/{conversation['id']}/messages", headers=other_auth).status_code == 404)
    check("other org sees no rules", other.get(f"{API}/rules", headers=other_auth).json() == [])
    check("other org cannot delete document", other.delete(f"{API}/knowledge/documents/{first_id}", headers=other_auth).status_code == 404)

    section("Logout")
    check("logout", client.post(f"{API}/auth/logout").status_code == 204)
    check("refresh after logout rejected", client.post(f"{API}/auth/refresh").status_code == 401)

    failed = [name for name, ok in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    if not gemini_ok:
        print("NOTE: some answers were fallbacks. Check GEMINI_API_KEY / GEMINI_MODEL in the root .env.")
    for name in failed:
        print(f"  FAILED: {name}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
