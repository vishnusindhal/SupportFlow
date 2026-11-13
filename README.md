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
