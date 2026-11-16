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
