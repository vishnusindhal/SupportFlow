# Interview Questions and Answers

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

The query is embedded and ranked against tenant-owned chunks. The top usable
excerpts are placed into a constrained prompt. Gemini answers from those
excerpts, and the response stores source citations. Without evidence, the
system returns a safe fallback instead of guessing.

## Why hybrid lexical and vector retrieval?

Exact terms are important for names, IDs, and project titles; semantic
similarity helps related wording. Combining both is simple and explainable for
the prototype.

## What happens if Gemini is unavailable?

The provider adapter raises a typed `ProviderError`. The chat route records a
provider fallback and tells the user that relevant company information exists
but a human should answer. The API does not silently pretend the model worked.

## How are refresh tokens secured?

Only a hash is stored in the database, the raw token is in an HttpOnly cookie,
and refresh rotates by revoking the old session and creating a replacement.

## Why use JSON for flows and rules?

Flows and rules are tenant-configurable structures that evolve faster than
fixed columns. Pydantic validates their shape, and the backend interprets
only the supported data/operators. JSON does not mean arbitrary code execution.

## What would you improve for production?

Add background ingestion, object storage, virus scanning, real embeddings and
vector indexes, persistent browser session restoration, rate limiting,
observability, secret management, provider retries/circuit breakers,
pagination, stronger accessibility, and CI/CD security scanning.

## What is the most important security rule?

Never let an LLM prompt become an authorization boundary. Prompts and
retrieved documents are untrusted input; authentication, tenant ownership,
permissions, and business rules are enforced in backend code.
