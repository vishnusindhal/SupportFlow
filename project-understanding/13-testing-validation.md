# Testing and Validation

## Test organization

- `test_v0_fixtures.py`: product fixture contract.
- `test_auth.py`: registration, login, refresh, and logout.
- `test_tenant_isolation.py`: cross-organization access protection.
- `test_onboarding.py`: templates, profiles, and completion.
- `test_knowledge.py`: uploads, parsing, chunking, retrieval, and isolation.
- `test_chat.py`: grounded chat, fallbacks, and persistence.
- `test_chat_memory.py`: follow-up rewriting, entity carry-over, human-review offer.
- `test_langgraph.py`: graph structure, semantic retrieval, retriever tenant
  isolation, rules before any model call, provider and rewrite failures.
- `test_flows.py`: state transitions, global intents, and entities.
- `test_rules.py`: operators, priority, dry run, malicious input, and rules.
- `test_rules_in_chat.py`: keyword intent classifier, rules firing in chat
  without a configured flow, `set_priority`, and rule options.
- `test_tickets.py`: ticket lifecycle, comments, escalation, and isolation.

Tests run offline: model calls are replaced by fake chains and
`EMBEDDING_PROVIDER=hash` is used, so no Gemini key is needed.

## Commands

```powershell
python -m pytest backend/tests -q
python -m ruff check backend/app backend/tests
npm --prefix frontend run lint
npm --prefix frontend run build
docker compose config --quiet
docker compose exec -T backend alembic current
```

Current baseline (2026-11-27): 62 backend tests passing, Ruff passing,
migration head `0007_v7_tickets`, frontend lint and production build passing.

Against a running stack, `python demo-inputs/e2e_check.py http://localhost:8000`
runs the end-to-end check.

## What the tests protect

The tests focus on behavior that could cause data leakage or unsafe answers:
tenant filters, token rotation, duplicate onboarding, focused retrieval,
grounded/provider fallback, deterministic transitions, rule type safety, and
malicious rule payloads.

## Known warnings

The repository currently has deprecation warnings for FastAPI startup events,
`datetime.utcnow`, and Starlette/httpx compatibility. They do not fail the
current suite but should be addressed before production hardening.

## Manual validation principle

Automated tests prove repeatable behavior. Manual checks prove the complete
browser/API journey: login, onboarding, upload, retrieval, chat, and rule
execution. Both are documented in the version files.

## Evaluation metrics and latency

Evaluation metrics and the measured query latency (about 1.7 s median for a
full chat answer, 0.55 s for retrieval alone) are in
[16-evaluation-metrics.md](./16-evaluation-metrics.md).
