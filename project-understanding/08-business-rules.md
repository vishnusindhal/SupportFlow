# Deterministic Business Rules

## Rule shape

A rule contains a name, one to twenty conditions, `all`/`any` logic, one typed
action, an integer priority, and an enabled flag. Condition fields allow
letters, digits, underscores, dots, and hyphens, which supports safe nested
context lookup such as `entities.order_id`.

## Evaluation

1. Load enabled rules for the authenticated organization.
2. Sort by ascending priority and creation time.
3. Resolve a dotted field from the runtime context.
4. Apply the typed operator.
5. Combine condition results with `all` or `any`.
6. Write a trace for each evaluated rule.
7. Stop at the first matching rule.

Supported operators are `equals`, `not_equals`, `contains`,
`greater_than`, `less_than`, and `in`. Numeric comparisons convert values to
floats and safely return non-match on invalid values.

## Actions

`escalate`, `require_approval`, `route_to_team`, `auto_respond`, and
`set_priority` are validated literal action types. They produce deterministic
chat responses and can offer escalation without asking Gemini to decide.

## Rule context and intents

Each chat message is evaluated against this context:

| Field | Value |
|---|---|
| `message` | The customer's text (use `contains` for keywords such as `lawyer`) |
| `intent` | `order_status`, `damaged_item`, `cancellation`, `returns`, `talk_to_agent` or `knowledge_question` |
| `entities.order_id` | An order ID such as `ORD-1234`, remembered across the conversation |
| `conversation.state` | The current flow state |

The intent comes from a deterministic keyword classifier
(`classify_intent` in `services/flow.py`), so rules on `intent` work even when no
conversation flow is configured. A model never decides an intent that can
trigger an escalation. Text comparisons ignore case, and `in` accepts a
comma-separated list (`returns, cancellation`). The API rejects condition fields
outside this context, and `GET /rules/options` lists the fields and intents for
the rules form.

`set_priority` does not stop the workflow: the assistant answers normally, and
any ticket created later in the conversation gets that priority. The other
actions reply immediately. Escalating actions create a ticket with the rule's
priority and team. Disabled rules can be enabled again from the rules screen.

## Audit and dry run

Chat execution creates `rule_execution_logs` with condition traces. The
`POST /api/v1/rules/test` endpoint evaluates the current tenant's rules
without a conversation or execution side effect.

## Security properties

The implementation never calls `eval`, `exec`, dynamic imports, SQL, or shell
commands. Rule JSON is data only. Pydantic rejects unknown fields, invalid
operators, invalid actions, and malformed field names.

## Interview trade-off

First-match-wins is predictable and easy to explain. A future product might
support rule priorities with conflict visualization, but it should preserve
deterministic ordering and auditability.
