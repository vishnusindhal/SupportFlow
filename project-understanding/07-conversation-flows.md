# Conversation Flow State Machine

## Data model

A tenant stores a versioned JSON flow with an initial state and named states.
Each state has a prompt, menu options, and a terminal flag. Each option has a
label and a required next state.

Pydantic uses `extra="forbid"` and a model validator to ensure the initial
state and every transition target exist.

## Decision order

`services/flow.py` evaluates input in this order:

1. `talk_to_agent` global intent
2. `restart`
3. `help`
4. current-state menu key or label
5. order status without an order ID
6. order status with an `ORD-1234`-style ID
7. ordinary knowledge question

The result contains intent, optional answer, next state, entities, escalation,
and whether the message was fully handled.

## Why deterministic

A language model can help interpret language, but it should not be allowed to
choose an unauthorized state transition or alter tenant workflow rules. The
backend validates the flow and applies exact state transitions.

## Persistence

The conversation stores `current_state` and `context_json`. Each message
stores `intent` and extracted `entities`, so later support and analytics can
explain what happened.

## Manual example

Configure `start -> order`, send `1`, then send `ORD-1234`. The first message
should move the conversation to `order`; the second should persist
`order_id=ORD-1234`. Send `restart` and verify the initial state returns.
