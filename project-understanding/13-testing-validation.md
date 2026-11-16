# Testing and Validation

## Test organization

- `test_v0_fixtures.py`: product fixture contract.
- `test_auth.py`: registration, login, refresh, and logout.
- `test_tenant_isolation.py`: cross-organization access protection.
- `test_onboarding.py`: templates, profiles, and completion.
- `test_knowledge.py`: uploads, parsing, chunking, retrieval, and isolation.
- `test_chat.py`: grounded chat, fallbacks, and persistence.
- `test_flows.py`: state transitions, global intents, and entities.
- `test_rules.py`: operators, priority, dry run, malicious input, and rules.

## Commands

```powershell
python -m pytest backend/tests -q
python -m ruff check backend/app backend/tests
npm --prefix frontend run lint
npm --prefix frontend run build
docker compose config --quiet
docker compose exec -T backend alembic current
```

The validated V6 baseline was 23 backend tests passing, Ruff passing, Compose
configuration passing, migration head `0006_v6_rules`, frontend lint passing,
and the production build passing.

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
