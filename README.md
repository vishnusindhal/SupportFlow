# SupportFlow AI

SupportFlow is a multi-tenant customer-support platform. Each company uploads
its own documents, and a support assistant answers customers from that
knowledge. Deterministic conversation flows and business rules run before any
model call, and the assistant hands off to a human through tickets when it
cannot answer safely.

The AI pipeline is built with **LangChain** (chains, retriever, embeddings,
text splitting) and **LangGraph** (the support workflow as a state graph).

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Router |
| Backend | FastAPI, Pydantic, SQLAlchemy, Alembic |
| AI | LangGraph, LangChain, Gemini chat + `gemini-embedding-001` |
| Database | PostgreSQL 16 + pgvector (SQLite for tests) |
| Runtime | Docker Compose |

## Repository layout

```text
backend/
  app/
    api/routes/      HTTP endpoints (auth, onboarding, knowledge, chat, flows, rules, tickets)
    services/ai/     LangChain + LangGraph: llm.py, ingestion.py, retriever.py, chains.py, graph.py
    services/        Domain logic: auth, onboarding, flow, rules, tickets, memory, knowledge
    models/          SQLAlchemy tables
    schemas/         Pydantic request/response models
    scripts/         reindex.py (re-embed documents after changing embedding model)
  alembic/           Database migrations
  tests/             Pytest suite
frontend/src/        React application
docs/fixtures/       Northstar Store policies, FAQs and evaluation questions
demo-inputs/         Sample documents, end-to-end check and latency script
project-understanding/  Architecture and implementation guide
```

## Run locally

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `JWT_SECRET_KEY`.
   Without a Gemini key the app still runs, using offline embeddings and safe
   fallbacks.
2. Start everything:

   ```powershell
   docker compose up --build
   ```

3. Open:
   - Frontend: http://localhost:5173
   - API docs: http://localhost:8000/docs
   - Health: http://localhost:8000/health

After editing code, rebuild only the changed service:

```powershell
docker compose build backend; docker compose up -d backend
docker compose build frontend; docker compose up -d frontend
```

After switching embedding models, re-embed existing documents:

```powershell
docker compose exec backend python -m app.scripts.reindex
```

## Backend development without Docker

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -e ".[dev]"
.venv\Scripts\alembic upgrade head
.venv\Scripts\uvicorn app.main:app --reload
```

## Checks

```powershell
# Backend tests (offline: model calls are faked, hash embeddings are used)
cd backend; .venv\Scripts\python -m pytest -q

# Backend lint
.venv\Scripts\python -m ruff check app tests

# Frontend
npm --prefix frontend run build
npm --prefix frontend run lint

# End-to-end against a running stack
python demo-inputs/e2e_check.py http://localhost:8000

# Query latency against a running stack
python demo-inputs/time_query.py docs/fixtures/northstar_store/policies
```

## Documentation

Start with [project-understanding/README.md](./project-understanding/README.md).
The LangChain and LangGraph design is in
[15-langchain-langgraph.md](./project-understanding/15-langchain-langgraph.md).

Commit messages use one concise imperative line without `feat`, `fix`, or
`docs` prefixes and without a colon.
