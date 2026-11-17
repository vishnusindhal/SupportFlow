# SupportFlow AI

SupportFlow is a multi-tenant customer-support platform. V0 defines the
Northstar Store prototype contract, V1 provides authentication and tenant-safe
foundations, V2 provides versioned industry-template onboarding, V3
provides a tenant-scoped knowledge base and retrieval prototype, V4-V6 provide
grounded chat, conversation flows, and business rules, and V7 adds ticket management
and human handoff.

## Local development

Create or edit the root `.env` file before starting the project. It is
ignored by Git and is intended for private values such as your Gemini API key:

```powershell
notepad .env
```

Set at least:

```dotenv
GEMINI_API_KEY=your-private-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_SECONDS=30
JWT_SECRET_KEY=replace-with-a-long-random-secret
```

Never commit `.env` or paste its contents into GitHub. Docker Compose passes
these values to the backend automatically, and backend local development reads
the same root `.env` file. If `GEMINI_API_KEY` is empty, the app continues
with the safe provider fallback instead of calling Gemini.

```powershell
docker compose up --build
```

If PyPI is temporarily slow during the image build, rerun the same command;
the backend pip install is configured with retries and a longer download
timeout. Docker caches the dependency layers and package-manager downloads:
editing application source only rebuilds the source-copy layer and later
layers.

For the fastest normal edit/reload loop, start the stack once and leave it
running:

```powershell
docker compose up --build
```

After changing `backend/app`, `backend/alembic`, or `frontend/src`, rebuild
only the changed service:

```powershell
docker compose build backend
docker compose up -d backend

docker compose build frontend
docker compose up -d frontend
```

Dependency installation is cached until its lock/requirements file changes:

- Backend: `backend/requirements-runtime.txt`
- Frontend: `frontend/package.json` or `frontend/package-lock.json`

Changing either dependency file intentionally invalidates the relevant install
layer. The `.dockerignore` files exclude virtual environments, `node_modules`,
build output, tests, uploads, and local databases from the build context.

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
Northstar Store e-commerce template. V3 adds document parsing, chunking,
embeddings, and tenant-filtered retrieval. V4 adds grounded AI chat, and V5
adds configurable conversation flows and deterministic intent routing. V6 adds
deterministic business rules before response generation. V7 adds tenant-scoped
ticket management, internal notes, and automatic human escalation from chat.

## Version implementation and validation record

This section records what was implemented in each version, what passed, what
did not pass, and how to check the result manually.

For the detailed AI-agent architecture, version history, function flows, and
database behavior, see [`ai-agent/README.md`](./ai-agent/README.md).

For a version-by-version implementation explanation with request flows,
validation, and manual checks, see the
[Project Understanding](./project-understanding/README.md) folder.

Commit messages use one concise imperative line without `feat`, `fix`, or
`docs` prefixes and without a colon.

| Version | Implemented | Automated validation | Known status |
|---|---|---|---|
| V0 | Northstar Store fixtures, policies, FAQs, evaluation questions, and UX contract | Fixture tests passed | Complete |
| V1 | Registration/login, JWT access tokens, rotating refresh tokens, Argon2id passwords, organizations, memberships, RBAC, and tenant isolation | Authentication and tenant-isolation tests passed | Complete |
| V2 | Versioned template registry, onboarding profile, immutable company configuration snapshot, duplicate protection, and onboarding UI | 8 backend tests passed; frontend build and lint passed | Complete |
| V3 | PDF/DOCX/TXT upload, private storage keys, parsing, chunking, local embeddings, pgvector schema, tenant-scoped retrieval, retry/delete APIs, and Knowledge Base UI | 11 backend tests passed; Ruff passed; frontend build/lint passed; Compose config passed | Complete |
| V4 | Tenant-scoped conversations, persisted messages and LLM usage, Gemini provider adapter, grounded answers with source citations, safe provider/evidence fallbacks, and admin chat preview | 3 V4 chat tests passed; Ruff passed; frontend build passed | Complete; Gemini key is optional and fallback behavior is expected without it |
| V5 | Tenant-configurable finite-state conversation flows, deterministic menu/global-intent routing, order-ID extraction, persisted conversation state/context, and RAG questions that preserve state | 4 V5 flow tests passed; 19 backend tests passed; Ruff passed | Complete |
| V6 | Tenant-owned typed rules, safe operators, priority matching, dry-run evaluation, execution audit logs, and deterministic chat actions | 4 V6 rules tests passed; full suite and Ruff passed | Complete |
| V7 | Tenant-scoped ticket lifecycle, internal comments, human handoff, idempotent escalation from chat rules, and full ticket management UI | 6 V7 ticket tests passed; 29 backend tests passed; Ruff passed; frontend build and lint passed | Complete |

### Validation commands

Run all backend tests:

```powershell
python -m pytest backend/tests -q
```

Expected result: all backend tests pass (warnings about deprecated FastAPI startup and
datetime APIs may be displayed).

Run backend lint:

```powershell
python -m ruff check backend/app backend/tests
```

Expected result: `All checks passed!`.

Run frontend checks:

```powershell
npm --prefix frontend run build
npm --prefix frontend run lint
```

Expected result: the Vite build succeeds and ESLint reports no errors. The
frontend lint command may show a Node module-type warning.

Validate Compose:

```powershell
docker compose config
```

Expected result: the resolved Compose configuration is printed without an
error.

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

Implemented: fictional Northstar Store policies, FAQs, evaluation questions,
and the screen-level UX contract. No database or AI service is required for
V0.

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

Expected result: the fixture test passes.

### V1 — Authentication and tenant isolation

Implemented: secure password hashing, access/refresh authentication,
organization membership, role checks, authenticated organization context, and
server-side tenant isolation.

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

Expected result: all selected V1 tests pass.

### V2 — Industry template and onboarding

Implemented: one versioned e-commerce template, company profile setup,
template preview/detail APIs, immutable tenant-owned configuration snapshots,
duplicate-completion protection, and the onboarding page.

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

Expected result: the V2 onboarding tests pass.

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

### V3 — Knowledge base and retrieval

Implemented: supported PDF, DOCX, and TXT uploads; MIME/extension/size
validation; opaque private storage keys; synchronous text extraction; roughly
120-word chunks with overlap; lexical plus vector ranking; focused excerpts
around matched query terms; 384-dimension local embeddings; PostgreSQL
pgvector storage; tenant-filtered retrieval; retry/delete behavior; and the
Knowledge Base page. The current embedding implementation is deterministic and
local so V3 can be tested without an external AI provider. Grounded chat is
implemented in V4 and conversation flows are implemented in V5.

1. Sign in and open **Knowledge base**.
2. Upload a `.txt`, `.pdf`, or `.docx` file.
3. Verify the document status becomes `ready`.
4. Enter a question in **Test retrieval** and confirm the returned passage
   comes from the uploaded file and is focused around the matching terms
   rather than displaying the entire document.
5. In the API docs, test the document list, detail, retry, delete, and
   `POST /api/v1/knowledge/retrieve` endpoints.
6. Register a second organization and verify it cannot retrieve the first
   organization's content.

### V4 — Grounded AI chat

V4 adds a server-side Gemini adapter. The browser never receives the Gemini
API key. Set the key before starting Docker for live answers:

```powershell
$env:GEMINI_API_KEY="your-key"
docker compose up --build
```

`GEMINI_MODEL` defaults to `gemini-3.5-flash-lite` and
`GEMINI_TIMEOUT_SECONDS` defaults to `30`. If the key is missing, Gemini
times out, or returns an error, the API stores a safe fallback response and
never fabricates an answer.

Manual check:

1. Sign in and upload a document containing a known company fact.
2. Open **Chat preview**.
3. Ask a question answered by that document.
4. Verify the response includes source excerpts from the uploaded document.
5. Ask an unrelated question and verify the response says there is not enough
   company information or that the provider is unavailable.
6. Put instruction-like text in a document and verify it is treated as quoted
   evidence, not as an instruction to the assistant.
7. In the API docs, verify:
   - `POST /api/v1/chat/conversations`
   - `GET /api/v1/chat/conversations/{id}/messages`
   - `POST /api/v1/chat/conversations/{id}/messages`
   - `POST /api/v1/chat/preview`

Run the V4 tests:

```powershell
python -m pytest backend/tests/test_chat.py -q
```

Expected result: `3 passed`. With no Gemini key, provider fallback is the
expected result; with a valid key, grounded questions should return a Gemini
answer and citations.

### V5 — Configurable conversation flow and intent handling

V5 adds a strict, tenant-owned finite-state machine around chat. Admins save a
versioned flow as validated JSON; the backend, not Gemini, decides whether a
menu option or global intent is allowed.

Manual check:

1. Sign in as the demo owner.
2. In API docs, save a flow with `PUT /api/v1/flows/current`, for example:

```json
{
  "flow": {
    "version": 1,
    "initial_state": "start",
    "states": {
      "start": {
        "prompt": "Choose an option.",
        "options": {
          "1": {"label": "Order status", "next_state": "order"}
        }
      },
      "order": {
        "prompt": "Please provide your order ID.",
        "options": {}
      }
    }
  }
}
```

3. Create a conversation with `POST /api/v1/chat/conversations`.
4. Send `1` to `POST /api/v1/chat/conversations/{id}/messages` and verify
   `intent=menu_selection` and `current_state=order`.
5. Send `I want to talk to a human` from any state and verify
   `action=escalate`.
6. Send `What is my order status?` and verify the response asks for a valid
   order ID; send `ORD-1234` and verify the extracted entity is persisted.
7. Ask a knowledge-base question during the flow and verify the response
   remains tenant-scoped and the conversation state is preserved.
8. Send invalid transition targets and verify the API returns `422`.

V5 endpoints:

- `GET /api/v1/flows/current`
- `PUT /api/v1/flows/current`
- `POST /api/v1/chat/conversations`
- `POST /api/v1/chat/conversations/{id}/messages`

Run the V5 tests:

```powershell
python -m pytest backend/tests/test_flows.py -q
```

Expected result: `4 passed`.

### V6 — Deterministic business rules

V6 evaluates explicit company rules after intent/entity extraction and before
retrieval or Gemini. Rules are data, not code: no `eval`, `exec`, SQL, shell,
or dynamic function execution is used.

Supported condition operators:

- `equals`
- `not_equals`
- `greater_than`
- `less_than`
- `contains`
- `in`

Supported actions are `escalate`, `require_approval`, `route_to_team`,
`auto_respond`, and `set_priority`. Enabled rules are ordered by ascending
priority and first-match-wins. Missing fields and type mismatches do not
match.

Manual check:

1. Sign in as an owner/admin.
2. In API docs, create a rule:

```json
{
  "name": "Escalate order requests",
  "conditions": [
    {"field": "intent", "operator": "equals", "value": "order_status"}
  ],
  "logic": "all",
  "action": {"type": "escalate", "message": "A support agent will help you."},
  "priority": 10,
  "enabled": true
}
```

3. Use `POST /api/v1/rules/test` with
   `{"context":{"intent":"order_status"}}` and verify a match without creating
   an execution log.
4. Send an order-status chat message and verify the rule response is returned
   before Gemini, with `action=escalate`.
5. Use `GET /api/v1/rules`, `PATCH /api/v1/rules/{id}`, and
   `DELETE /api/v1/rules/{id}` to manage the tenant rules.
6. Register another organization and verify it cannot read, update, or fire
   the first organization's rules.

V6 endpoints:

- `GET /api/v1/rules`
- `POST /api/v1/rules`
- `PATCH /api/v1/rules/{id}`
- `DELETE /api/v1/rules/{id}` (disables the rule)
- `POST /api/v1/rules/test`

Run the V6 tests:

```powershell
python -m pytest backend/tests/test_rules.py -q
```

Expected result: `4 passed`.

Run the V3 tests:

```powershell
cd backend
pytest tests/test_knowledge.py -q
```

Expected result: the three V3 knowledge tests pass. For API-only checking,
use an authenticated token in `http://localhost:8000/docs` and test:

- `POST /api/v1/knowledge/documents` with a PDF, DOCX, or TXT multipart file
- `GET /api/v1/knowledge/documents`
- `GET /api/v1/knowledge/documents/{id}`
- `POST /api/v1/knowledge/documents/{id}/retry`
- `DELETE /api/v1/knowledge/documents/{id}`
- `POST /api/v1/knowledge/retrieve` with `{"query":"...", "top_k":5}`

To confirm tenant isolation, upload a private phrase while signed in as
Company A, sign in as Company B, retrieve using that phrase, and verify that
the result list is empty.

If a document was uploaded before the V3 chunking/ranking fix, delete it and
upload it again (or use the retry endpoint) so its old large chunks are
recreated.
