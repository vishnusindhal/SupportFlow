# SupportFlow AI

SupportFlow is a multi-tenant customer-support platform. V0 defines the
Northstar Store prototype contract and V1 provides authentication,
organizations, memberships, RBAC, and tenant-safe API foundations.

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

AI, RAG, LangChain, pgvector, and external integrations are intentionally
deferred until later versions.

