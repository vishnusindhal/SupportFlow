# SupportFlow AI Agent Documentation

This folder explains what SupportFlow currently contains, how each version was
built, and how the main functions work together.

## Current implementation status

SupportFlow is currently implemented through **V6**:

| Version | Status | Main capability |
|---|---|---|
| V0 | Complete | Northstar Store fixtures and product UX contract |
| V1 | Complete | Authentication, organizations, RBAC, JWT, and tenant isolation |
| V2 | Complete | Industry templates and company onboarding |
| V3 | Complete | Private knowledge uploads, parsing, chunking, embeddings, and retrieval |
| V4 | Complete | Grounded Gemini chat with citations and safe fallbacks |
| V5 | Complete | Configurable conversation flows and deterministic intent handling |
| V6 | Complete | Deterministic business rules and auditable rule execution |
| V7+ | Not started | Tickets, integrations, and analytics |

The current AI behavior is intentionally controlled. The system does not run
autonomous agents, execute SQL or shell commands, call arbitrary tools, or
change permissions. It retrieves tenant-owned evidence and asks Gemini to
answer only from that evidence.

## System architecture

```text
Browser
  |
  | React/Vite, access token
  v
FastAPI API
  |
  +-- Authentication and tenant context
  +-- Onboarding and configuration
  +-- Knowledge upload and retrieval
  +-- Grounded chat
  |
  +--> PostgreSQL + pgvector
  +--> Private uploads storage
  +--> Gemini REST API (server-side API key only)
```

### Main code areas

- `backend/app/api/routes/`: HTTP endpoints.
- `backend/app/services/`: parsing, embeddings, retrieval, and provider
  integrations.
- `backend/app/models/`: PostgreSQL/SQLAlchemy entities.
- `backend/app/schemas/`: request and response validation.
- `backend/alembic/versions/`: database migrations.
- `frontend/src/app/App.tsx`: current frontend routes and screens.
- `docker-compose.yml`: PostgreSQL, backend, and frontend services.

## Version details

### V0 — Product fixtures and UX contract

V0 created the fictional Northstar Store reference data used by the product:

- Policies.
- FAQs.
- Evaluation questions.
- Screen-level UX expectations.

This version does not use a database or AI provider. It provides stable
fixtures and a product contract for later versions.

### V1 — Authentication and tenant foundation

V1 added the security and organization foundation:

1. A user registers with an organization.
2. The backend hashes the password with Argon2id.
3. The backend creates the organization and membership.
4. Login returns a short-lived JWT access token and a rotating refresh token.
5. The authenticated request creates an `AuthContext`.
6. The organization is derived from the membership, not trusted from a
   client-supplied organization ID.
7. Role dependencies restrict owner/admin operations.

Important functions:

- Authentication routes validate credentials and issue tokens.
- Refresh rotates tokens and rejects reuse.
- Tenant-scoped queries filter by the organization from `AuthContext`.

### V2 — Industry templates and onboarding

V2 added the company setup flow:

1. The frontend loads available versioned templates.
2. The user enters a company name and chooses a template.
3. The backend validates the template and profile.
4. Completion creates an immutable, tenant-owned configuration snapshot.
5. A second completion attempt is rejected.

The Northstar Store e-commerce template is the first implemented template.
Configuration belongs to the tenant and cannot be read by another
organization.

### V3 — Knowledge base and retrieval

V3 turns company files into searchable private knowledge:

1. An owner/admin uploads a PDF, DOCX, or TXT file.
2. The backend validates the extension, MIME type, and size.
3. The file receives an opaque private storage key.
4. Text is extracted from the file.
5. Text is split into approximately 120-word chunks with overlap.
6. Each chunk receives a deterministic 384-dimension local embedding.
7. Chunks are stored with organization and document ownership.
8. A retrieval query ranks chunks using lexical overlap and vector similarity.
9. The API returns focused excerpts instead of the entire document.

Retrieval scoring currently combines:

```text
score = 70% lexical query-term overlap + 30% vector similarity
```

PostgreSQL uses pgvector for database-side vector support. The local test
fallback ranks chunks in Python. Every retrieval query is tenant-filtered.

### V4 — Grounded AI chat

V4 adds controlled chat on top of V3 retrieval:

1. An owner/admin opens **Chat preview**.
2. The browser sends the question and access token to
   `POST /api/v1/chat/preview`.
3. The backend creates an `admin_preview` conversation.
4. The user question is persisted as a message.
5. Retrieval finds matching chunks from the current organization only.
6. The backend keeps up to three relevant source excerpts.
7. The excerpts are placed in a prompt as quoted, untrusted evidence.
8. Gemini receives the prompt through the backend provider adapter.
9. The assistant answer, source citations, latency, model, outcome, and
   retrieval IDs are persisted.
10. The frontend displays the answer and source excerpts.

If there is no relevant evidence, the backend does not call Gemini and returns
a safe "not enough company information" response. If Gemini is unavailable,
times out, or returns a provider error, the backend returns a provider
fallback and offers human support.

The Gemini API key is loaded from the local root `.env` and is never sent to
the browser. Docker Compose passes it to the backend container.

### V5 — Configurable conversation flow and intent handling

V5 adds a tenant-configurable finite-state machine around V4 chat:

1. An owner/admin saves a strict JSON flow through
   `PUT /api/v1/flows/current`.
2. The flow defines an initial state, prompts, menu options, allowed
   transitions, and terminal-state flags.
3. New conversations start in the configured initial state.
4. A message is checked against the current state's menu options first.
5. Global intents (`help`, `restart`, and `talk_to_agent`) are available from
   every state.
6. Order IDs are extracted only with a constrained pattern such as
   `ORD-1234`.
7. Menu and global-intent responses are deterministic and do not call Gemini.
8. Other questions use the existing tenant-scoped RAG path and preserve the
   conversation state.
9. Current state, context, intent, and entities are persisted with the
   conversation/message records.

The flow JSON is validated with Pydantic. Unknown fields and transitions to
undefined states are rejected. User flow configuration is data only; it is
never executed as Python, SQL, or shell code.

### V6 — Deterministic business rules

V6 applies typed company rules after V5 intent/entity extraction and before
retrieval or Gemini generation:

1. Admins create validated tenant-owned rules.
2. Each rule contains conditions, `all`/`any` logic, priority, enabled state,
   and one typed action.
3. Rules are ordered by priority and the first matching rule wins.
4. The interpreter supports only `equals`, `not_equals`, `greater_than`,
   `less_than`, `contains`, and `in`.
5. Missing fields and invalid numeric comparisons do not match.
6. Actions can escalate, require approval, route to a team, auto-respond, or
   set priority.
7. Matched actions are deterministic and are returned before Gemini.
8. Every evaluated rule produces an auditable execution trace.
9. A dry-run evaluates rules without creating conversation side effects.

Rule configuration is never executed as code. The evaluator uses typed Python
comparisons only, and all rule queries are scoped to the authenticated
organization.

## Chat function flow

### Frontend

`ChatPreview`:

1. Reads the current access token from `AuthProvider`.
2. Sends `{ "content": "..." }` to the preview endpoint.
3. Stores the response in component state.
4. Renders the answer and each source using its chunk ID as the React key.

### Backend

`preview()`:

1. Requires an owner or admin role.
2. Creates a tenant-owned conversation.
3. Calls `respond()`.

`respond()`:

1. Confirms the conversation belongs to the current tenant.
2. Stores the user message.
3. Calls `retrieve_sources()`.
4. Filters out chunks with no lexical query match.
5. Builds `SourceReference` objects.
6. Calls `GeminiProvider.generate()` when evidence exists.
7. Handles `ProviderError` without exposing provider details to the user.
8. Stores the assistant message and `LLMUsage`.
9. Returns `ChatResponse`.

`GeminiProvider.generate()`:

1. Reads `GEMINI_API_KEY`, `GEMINI_MODEL`, and
   `GEMINI_TIMEOUT_SECONDS` from settings.
2. Sends a server-side REST request to Gemini `generateContent`.
3. Converts transient HTTP and response-shape failures into `ProviderError`.
4. Returns generated text and token usage when successful.

## Database entities

- `users`: account identity and password hash.
- `organizations`: tenant boundary.
- `memberships`: user roles within organizations.
- `company_configs`: immutable onboarding configuration snapshots.
- `company_documents`: uploaded document metadata and processing status.
- `knowledge_chunks`: extracted searchable content and embeddings.
- `conversations`: tenant-owned chat sessions.
- `messages`: user and assistant messages.
- `llm_usage`: provider, model, latency, outcome, and retrieval audit data.
- `conversation_flows`: versioned tenant-owned state-machine configuration.
- `company_rules`: typed tenant-owned business rules.
- `rule_execution_logs`: matched-rule traces and audit results.

## Local setup

Create the ignored root `.env` file:

```dotenv
GEMINI_API_KEY=your-private-key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_SECONDS=30
JWT_SECRET_KEY=replace-with-a-long-random-secret
```

Start the services:

```powershell
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Manual V4 verification

1. Sign in at the frontend.
2. Upload a document containing a known fact under **Knowledge base**.
3. Open **Chat preview**.
4. Ask a question answered by the uploaded document.
5. Confirm the response is grounded and shows source excerpts.
6. Ask an unrelated question and confirm the safe fallback.
7. Check that the browser never contains the Gemini API key.
8. Register another organization and confirm it cannot retrieve the first
   organization's documents or conversations.

## Manual V5 verification

1. Save a flow with `PUT /api/v1/flows/current`.
2. Start a conversation and select a configured menu option.
3. Verify `intent`, `current_state`, and `action` in the response.
4. Test `help`, `restart`, and `I want to talk to a human` from different
   states.
5. Test missing and valid order IDs.
6. Ask a knowledge question during a menu flow and verify state is retained.
7. Register a second organization and verify it cannot read or change the
   first organization's flow.

## Manual V6 verification

1. Create a typed rule through `POST /api/v1/rules`.
2. Test it with `POST /api/v1/rules/test`.
3. Trigger it through a conversation message and verify the deterministic
   action occurs before Gemini.
4. Verify the matched rule and condition trace are stored.
5. Disable it with `DELETE /api/v1/rules/{id}` and verify it no longer fires.
6. Verify a second organization cannot access the rule.

## Automated verification

```powershell
python -m pytest backend/tests -q
python -m ruff check backend/app backend/tests
npm --prefix frontend run lint
npm --prefix frontend run build
docker compose config
```

The V4 implementation is considered healthy when the backend tests, lint,
frontend checks, and Compose validation pass.
