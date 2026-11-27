# Interview Questions and Answers

## Why LangGraph instead of one function or a prebuilt agent?

Each step is a small node with typed state, and every branch is an explicit
edge. The model is used in two nodes only and never chooses an action, tool,
permission or tenant, which keeps the workflow auditable and testable.

## Why is tenant isolation implemented in the backend?

The browser is untrusted. The backend derives organization context from the
authenticated membership and applies organization filters to every
organization-owned query. A client-provided organization ID cannot authorize
access.

## Why does the system use deterministic logic before Gemini?

State transitions, permissions, escalation, approval, and eligibility require
repeatable behavior. The model can generate language, but typed backend code
must decide whether an action is allowed.

## How is a document question answered?

The LangGraph workflow first runs intent detection and business rules. If
neither handles the message, `condense_question` rewrites a follow-up into a
standalone question, `TenantHybridRetriever` ranks tenant-owned chunks, and
the `generate` node asks Gemini for a structured `GroundedAnswer` from the top
three excerpts. Only the cited sources are returned. Without evidence, the
system offers a human review instead of guessing.

## Why hybrid lexical and vector retrieval?

Exact terms are important for names, IDs, and project titles; semantic
similarity helps related wording. Combining both is simple and explainable for
the prototype.

## What happens if Gemini is unavailable?

Every model call is wrapped at the node boundary. The rewrite falls back to
the original question, query embedding falls back to word search, and a failed
answer becomes `provider_fallback` with a human-review offer. The outcome is
recorded in `llm_usage`. No step returns an invented answer.

## How are refresh tokens secured?

Only a hash is stored in the database, the raw token is in an HttpOnly cookie,
and refresh rotates by revoking the old session and creating a replacement.

## Why use JSON for flows and rules?

Flows and rules are tenant-configurable structures that evolve faster than
fixed columns. Pydantic validates their shape, and the backend interprets
only the supported data/operators. JSON does not mean arbitrary code execution.

## What would you improve for production?

Add background ingestion, object storage, virus scanning, vector indexes and a
reranker, an evaluation pipeline, persistent browser session restoration, rate limiting,
observability, secret management, provider retries/circuit breakers,
pagination, stronger accessibility, and CI/CD security scanning.

## What is the most important security rule?

Never let an LLM prompt become an authorization boundary. Prompts and
retrieved documents are untrusted input; authentication, tenant ownership,
permissions, and business rules are enforced in backend code.
