# System Architecture and Request Lifecycle

## Components

```text
React/Vite browser
    |
    | HTTP JSON + Bearer access token
    v
FastAPI routers  (backend/app/api/routes/)
    |
    +-- dependencies: authentication, membership, role checks
    +-- domain services: onboarding, flow, rules, tickets, memory
    +-- AI layer (backend/app/services/ai/)
    |     llm.py        chat model + embeddings factories (LangChain interfaces)
    |     ingestion.py  load -> split -> embed -> store
    |     retriever.py  TenantHybridRetriever (LangChain BaseRetriever)
    |     chains.py     two LCEL chains: condense + grounded answer
    |     graph.py      LangGraph StateGraph: the support workflow
    +-- SQLAlchemy session
    v
PostgreSQL + pgvector

Backend -- LangChain (langchain-google-genai) --> Gemini chat + embeddings
Backend -- local filesystem / Docker volume --> private uploads
```

## Application startup

`backend/app/main.py` creates the FastAPI application, installs CORS for the
Vite origin, registers all `/api/v1` routers, seeds the active Northstar Store
template, and exposes `/health`. The container entrypoint applies Alembic
migrations before starting Uvicorn. The LangGraph workflow is compiled once at
import time (`support_graph` in `graph.py`).

## Standard request lifecycle

1. The browser sends an HTTP request.
2. FastAPI parses and validates the request with Pydantic.
3. `get_current_context` validates the JWT and loads the active membership.
4. `require_roles` optionally checks owner/admin permissions.
5. The route calls a focused service, or for chat, invokes the LangGraph
   workflow.
6. SQLAlchemy reads/writes only the authenticated organization scope.
7. The route returns a typed response or an explicit HTTP error.

## Chat request lifecycle

```text
POST /chat/conversations/{id}/messages
  -> route checks the conversation belongs to the tenant
  -> support_graph.ainvoke({"message": ...},
         config={"configurable": {db, context, conversation}})
       load_context -> detect_intent -> evaluate_rules
         -> rule_action | flow_reply | condense_question -> retrieve -> generate
         -> offer_human_review / escalate (when needed)
         -> persist
  -> route maps the final state to ChatResponse
```

Runtime dependencies travel in `config["configurable"]`, so the graph state
holds only plain data. Details: [15-langchain-langgraph.md](./15-langchain-langgraph.md).

## Layer responsibilities

- **Routes:** HTTP status codes, dependencies, serialization, and orchestration.
- **Schemas:** input constraints and response shapes.
- **Domain services:** deterministic logic such as hashing, flow decisions,
  rule comparisons, and ticket lifecycle.
- **AI layer:** everything LangChain/LangGraph. Provider details live only in
  `llm.py`; the rest depends on `BaseChatModel` and `Embeddings`.
- **Models:** database tables and typed columns.
- **Migrations:** reproducible schema history.
- **Frontend:** navigation, forms, access-token headers, and result rendering.

## Why this architecture

FastAPI keeps security and application decisions server-side. PostgreSQL gives
strong tenant-scoped persistence. LangChain interfaces keep the model provider
swappable. LangGraph makes the workflow explicit: deterministic nodes (intent,
rules, tickets) run before any model call, and every branch is a graph edge
written in code, not a model decision.

## Source map

- Backend entrypoint: `backend/app/main.py`
- Auth dependency: `backend/app/api/deps.py`
- Configuration: `backend/app/core/config.py`
- Security helpers: `backend/app/core/security.py`
- Routes: `backend/app/api/routes/`
- AI layer: `backend/app/services/ai/`
- Domain services: `backend/app/services/`
- Models: `backend/app/models/`
- Frontend shell: `frontend/src/app/App.tsx`
