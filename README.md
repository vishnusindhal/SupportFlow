# SupportFlow AI

SupportFlow is a multi-tenant customer-support platform. V0 defines the
Northstar Store prototype contract, V1 provides authentication and tenant-safe
foundations, and V2 provides versioned industry-template onboarding.

## Local development

```powershell
docker compose up --build
```

The API is available at `http://localhost:8000/docs` and the frontend at
`http://localhost:5173`.

For backend-only development:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -e ".[dev]"
$env:DATABASE_URL="sqlite:///./supportflow.db"
alembic upgrade head
pytest
```

V2 onboarding creates a tenant-owned configuration snapshot from the
Northstar Store e-commerce template. AI, RAG, LangChain, pgvector, and
external integrations are intentionally deferred until later versions.

## Run and manually verify each version

Run these commands from the repository root:

```powershell
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- API documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### V0 — Scope and demo fixtures

Review the fictional Northstar Store data in:

- `docs/fixtures/northstar_store/policies/`
- `docs/fixtures/northstar_store/faqs.json`
- `docs/fixtures/northstar_store/evaluation_questions.json`
- `docs/ux/v0-screen-contract.md`

Run the fixture test:

```powershell
cd backend
pytest tests/test_v0_fixtures.py -q
```

### V1 — Authentication and tenant isolation

1. Open `http://localhost:5173`.
2. Sign in to the demo shell.
3. Use the API docs to test:
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/login`
   - `GET /api/v1/auth/me`
   - `GET /api/v1/organizations/current`
   - `POST /api/v1/auth/refresh`
   - `POST /api/v1/auth/logout`
4. Register two different organizations and verify each token returns only
   its own organization.

Run the V1 tests:

```powershell
cd backend
pytest tests/test_auth.py tests/test_tenant_isolation.py -q
```

### V2 — Industry template and onboarding

1. Sign in at `http://localhost:5173/login`.
2. Open **Onboarding**.
3. Enter a company name.
4. Select **E-commerce — Northstar Store**.
5. Click **Confirm setup**.
6. Verify the setup returns to the dashboard.
7. In `http://localhost:8000/docs`, test:
   - `GET /api/v1/templates`
   - `GET /api/v1/templates/{template_id}`
   - `GET /api/v1/onboarding/status`
   - `PUT /api/v1/onboarding/profile`
   - `POST /api/v1/onboarding/complete`
   - `GET /api/v1/configuration/current`
8. Call onboarding completion a second time and verify it returns `409`.
9. Register a second organization and verify it cannot read the first
   organization's configuration.

Run the V2 tests:

```powershell
cd backend
pytest tests/test_onboarding.py -q
```

### Database and migration check

The PostgreSQL database starts through Docker Compose. To rebuild it from
scratch and apply all migrations:

```powershell
docker compose down -v
docker compose up --build
```

The backend runs `alembic upgrade head` automatically on startup. The
migration can also be run manually:

```powershell
cd backend
$env:DATABASE_URL="postgresql+psycopg://supportflow:supportflow@localhost:5432/supportflow"
alembic upgrade head
```

V3 and later are not implemented yet. They will add document ingestion,
retrieval, grounded chat, workflows, rules, tickets, integrations, and
analytics incrementally.
