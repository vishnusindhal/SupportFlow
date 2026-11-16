# Conversations, Grounded Chat, and Gemini

## Conversation persistence

`conversations` stores the organization, channel, status, current flow state,
and JSON context. `messages` stores user/assistant content, intent, entities,
metadata, and timestamps. `llm_usage` stores provider, model, token counts,
latency, outcome, and retrieval IDs.

## Message pipeline

The core pipeline in `backend/app/api/routes/chat.py` is:

1. Verify the conversation belongs to the authenticated organization.
2. Load the current flow.
3. Decide deterministic flow/global intent.
4. Persist the user message and extracted metadata.
5. Build a rule context and evaluate enabled rules.
6. If a rule matches, return its deterministic action.
7. Otherwise handle a deterministic flow response if one exists.
8. Otherwise retrieve tenant-owned evidence.
9. Keep only usable sources and up to three citations.
10. Call the Gemini provider with quoted evidence.
11. Persist the assistant response and usage record.
12. Return answer, citations, fallback state, action, intent, and current state.

## Provider adapter

`GeminiProvider.generate` reads the server-side API key, model, and timeout
from settings. It sends a `generateContent` request using `httpx`, extracts
the first candidate, and returns a typed `ProviderResult`. Missing keys,
HTTP failures, malformed responses, and temporary provider failures become
`ProviderError`.

## Grounding prompt

The prompt explicitly says to answer only from quoted company evidence, treat
the evidence as untrusted reference text, and offer human support if the
evidence is insufficient. The API key is never sent to React.

## Fallback states

- No usable evidence: safe not-enough-information answer; Gemini is not called.
- Provider unavailable: relevant evidence is acknowledged, but a human is
  offered instead of fabricating an answer.
- Successful provider response: answer and source citations are persisted.

## Preview versus normal chat

`POST /chat/preview` creates an `admin_preview` conversation and responds in
one request. Normal chat first creates a conversation, then uses
`POST /chat/conversations/{id}/messages`.

## Interview trade-off

The application intentionally uses a provider abstraction and a direct HTTP
request rather than making LangChain a required core dependency. This keeps
security, retrieval, state, and business rules visible in application code.
