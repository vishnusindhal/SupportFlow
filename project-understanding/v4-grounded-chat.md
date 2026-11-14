# V4 Grounded Gemini Chat

## Goal

V4 added tenant-scoped conversations and controlled Gemini answers grounded in
retrieved company evidence.

## Implementation process

1. Add conversation and message persistence.
2. Add LLM usage records for model, latency, outcome, and retrieval metadata.
3. Create a provider abstraction around Gemini.
4. Retrieve relevant chunks before generation.
5. Put only a small number of source excerpts into a constrained prompt.
6. Instruct the model to answer only from quoted evidence.
7. Return source citations with the answer.
8. Add safe fallbacks for missing evidence, provider errors, and timeouts.
9. Load the API key from the ignored root `.env` through Docker Compose.
10. Add the admin Chat Preview screen.

## Request flow

`ChatPreview` sends a question to `POST /api/v1/chat/preview`. The backend
creates or loads an admin-preview conversation, persists the user message,
retrieves tenant-owned chunks, and calls Gemini only when useful evidence
exists. The answer, citations, usage details, and assistant message are then
persisted.

## Safety behavior

- Gemini credentials never reach the browser.
- No evidence means no Gemini call and a safe not-enough-information answer.
- Provider failure returns a safe fallback and offers human support.
- Retrieved documents are treated as untrusted evidence, not instructions.
- Conversation and retrieval queries are tenant-scoped.

## Validation

V4 chat tests passed. Ruff and frontend build passed. Playwright verification
confirmed a grounded Eventopia response with HTTP 200 and `fallback: false`
when Gemini was configured.

## Manual check

1. Put `GEMINI_API_KEY`, `GEMINI_MODEL`, and timeout settings in the root
   `.env`.
2. Start Docker Compose and open `/chat`.
3. Ask a question answered by an uploaded company document.
4. Confirm the answer includes source citations.
5. Ask about an unknown topic and confirm the safe evidence fallback.
6. Temporarily remove the API key and confirm the provider fallback works.

## Boundary

V4 generates grounded text but does not decide permissions, tenant identity, or
business eligibility. Those remain backend responsibilities.
