# System Architecture and Request Lifecycle

## Components

```text
React/Vite browser
    |
    | HTTP JSON + Bearer access token
    v
FastAPI routers
    |
    +-- dependencies: authentication, membership, role checks
    +-- services: onboarding, knowledge, flow, rules, Gemini provider
    +-- SQLAlchemy session
    v
PostgreSQL + pgvector

Backend -- server-side HTTPS --> Gemini REST API
Backend -- local filesystem --> private uploads
```

## Application startup

`backend/app/main.py` creates the FastAPI application, installs CORS for the
Vite origin, registers all `/api/v1` routers, seeds the active Northstar Store
template, and exposes `/health`. The container entrypoint applies Alembic
migrations before starting Uvicorn.

## Standard request lifecycle

1. The browser sends an HTTP request.
2. FastAPI parses and validates the request with Pydantic.
3. `get_current_context` validates the JWT and loads the active membership.
4. `require_roles` optionally checks owner/admin permissions.
5. The route calls a focused service or performs the use case.
6. SQLAlchemy reads/writes only the authenticated organization scope.
7. The route returns a typed response or an explicit HTTP error.

## Layer responsibilities

- **Routes:** HTTP status codes, dependencies, serialization, and orchestration.
- **Schemas:** input constraints and response shapes.
- **Services:** reusable domain logic such as hashing, parsing, ranking,
  flow decisions, and rule comparisons.
- **Models:** database tables and typed columns.
- **Migrations:** reproducible schema history.
- **Frontend:** navigation, forms, access-token headers, and result rendering.

## Why this architecture

FastAPI keeps security and application decisions server-side. PostgreSQL gives
strong tenant-scoped persistence. A provider adapter prevents Gemini details
from leaking into routes. Deterministic flow/rule services provide predictable
behavior around the probabilistic model.

## Source map

- Backend entrypoint: `backend/app/main.py`
- Auth dependency: `backend/app/api/deps.py`
- Configuration: `backend/app/core/config.py`
- Security helpers: `backend/app/core/security.py`
- Routes: `backend/app/api/routes/`
- Services: `backend/app/services/`
- Models: `backend/app/models/`
- Frontend shell: `frontend/src/app/App.tsx`
