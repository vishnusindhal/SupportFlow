# Interview Roadmap

## One-minute project explanation

SupportFlow is a multi-tenant customer-support platform. A company owner
creates a workspace, selects an industry configuration, uploads private
support documents, and tests a support assistant. The assistant retrieves
tenant-owned evidence and can use Gemini to produce a grounded answer. Before
retrieval or Gemini, deterministic conversation flows and company rules handle
known workflows safely.

The backend is FastAPI with Pydantic and SQLAlchemy. PostgreSQL stores
relational data and pgvector-compatible embeddings. The frontend is React,
TypeScript, Vite, and React Router. Docker Compose runs PostgreSQL, the
backend, and the frontend locally.

## Five-minute explanation

1. **Tenant boundary:** Every organization-owned row has an
   `organization_id`. The backend derives the organization from the active
   membership in the access token context.
2. **Setup:** V2 exposes a versioned template and creates an immutable company
   configuration snapshot.
3. **Knowledge:** V3 validates an upload, extracts text, creates overlapping
   chunks, generates deterministic 384-dimensional embeddings, and ranks
   tenant-owned chunks.
4. **Chat:** V4 persists conversations and messages, retrieves evidence, and
   calls Gemini through a provider adapter only when evidence exists.
5. **Control:** V5 handles menu/global intents deterministically. V6 evaluates
   typed rules in priority order before any model call.
6. **Fallback:** Missing evidence and provider failure produce explicit safe
   responses rather than invented answers.

## Version timeline

| Version | Interview sentence |
|---|---|
| V0 | Defined the Northstar Store product contract and test fixtures. |
| V1 | Added identity, organizations, memberships, RBAC, and tenant isolation. |
| V2 | Added versioned industry templates and one-time onboarding. |
| V3 | Added private document processing and retrieval. |
| V4 | Added grounded Gemini chat with citations and fallbacks. |
| V5 | Added tenant-configurable deterministic conversation flows. |
| V6 | Added typed business rules, priority matching, and audit traces. |
| V7 | Added tenant ticket management, human handoff, comments, and chat auto-escalation. |

## Best demo path

1. Open `http://localhost:5173`.
2. Use **Sign in to demo**.
3. Complete **Onboarding**.
4. Upload a small `.txt` document in **Knowledge base**.
5. Retrieve a phrase from the document.
6. Ask the same question in **Chat preview**.
7. Create an escalation rule in **Rules**.
8. Ask an order-status question and show that the deterministic rule runs
   before Gemini.

## Important design statement

This is a controlled AI application, not an unrestricted autonomous agent.
LLMs never decide tenant identity, authorization, rule eligibility, or state
permissions. Those decisions stay in validated backend code.
