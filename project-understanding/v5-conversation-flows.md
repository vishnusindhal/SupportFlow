# V5 Configurable Conversation Flows

## Goal

V5 added tenant-owned finite-state conversation flows and deterministic
intent handling around the V4 chat pipeline.

## Implementation process

1. Define strict Pydantic schemas for states, menus, options, transitions, and
   terminal states.
2. Validate that the initial state and every transition target exist.
3. Add versioned tenant-owned flow persistence.
4. Add `GET` and `PUT /api/v1/flows/current`.
5. Initialize each new conversation from the configured initial state.
6. Check menu selections before retrieval or Gemini.
7. Add global `help`, `restart`, and `talk_to_agent` intents.
8. Extract order IDs only from constrained formats such as `ORD-1234`.
9. Persist state, context, intent, and entities.
10. Preserve the existing RAG path for questions that are not flow commands.

## Request flow

Each message is first evaluated against the current flow state. A menu choice
or global intent produces a deterministic response and state transition. A
normal support question keeps the conversation state and continues to
tenant-scoped retrieval and grounded generation.

## Important behavior

- Flow definitions are data validated by Pydantic.
- Unknown fields and undefined transitions are rejected.
- State transitions never execute Python, SQL, shell, or arbitrary expressions.
- Deterministic commands do not call Gemini.
- Order-ID extraction avoids treating ordinary words as IDs.

## Validation

Four V5 flow tests passed, with 19 backend tests passing at that stage. Ruff
passed.

## Manual check

1. Configure a flow with `PUT /api/v1/flows/current`.
2. Start a new chat conversation.
3. Select a menu option and confirm the configured next state.
4. Send `help`, `restart`, and `talk to agent`.
5. Send an order ID such as `ORD-1234` and confirm it is stored as an entity.
6. Ask a knowledge question and confirm RAG still works without losing state.
7. Submit an invalid transition and confirm validation fails.

## Boundary

V5 makes routing deterministic. It does not let an LLM change permissions or
perform business actions.
