# Decision log

## V0/V1

- Keep the initial system monolithic and synchronous.
- Use a hashed opaque refresh token instead of storing a bearer token in the
  database.
- Keep tenant scoping in application repositories; RLS remains a later
  defense-in-depth enhancement once transaction-local context is established.
- Do not install AI or deferred infrastructure dependencies before V3/V4.

## V2

- Keep company configuration immutable per onboarding version.
- Industry templates supply deterministic seed data without hardcoding organization defaults.

## V3

- Document ingestion uses deterministic chunking with SHA-256 deduplication.
- Vector retrieval enforces tenant organization boundaries prior to similarity ranking.

## V4

- Use server-side Gemini client with deterministic fallbacks when API keys are absent.
- Record LLM audit metrics including latency and token counts per interaction.

## V5

- Conversation flows are structured state machines with explicit state transitions.
- Flow configurations are strictly validated JSON, preventing arbitrary code execution.

## V6

- Rule evaluation engine evaluates rules by priority and executes the first matching rule.
- Comparison operators are typed and whitelisted (`equals`, `contains`, `greater_than`, etc.).

## V7

- Escalation from chat conversations to tickets is idempotent to avoid duplicate tickets for active issues.
- Ticket comments distinguish internal notes (`is_internal=True`) from customer communications.
- Ticket queries enforce tenant boundaries at the database filter level.

