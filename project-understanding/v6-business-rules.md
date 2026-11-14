# V6 Deterministic Business Rules

## Goal

V6 added tenant-owned typed business rules that execute after V5 intent/entity
extraction and before retrieval or Gemini.

## Implementation process

1. Define strict schemas for conditions, logic, priorities, and typed actions.
2. Support only safe operators: `equals`, `not_equals`, `greater_than`,
   `less_than`, `contains`, and `in`.
3. Add `CompanyRule` and `RuleExecutionLog` models.
4. Add the `0006_v6_rules` migration.
5. Add tenant-scoped list, create, update, disable, and dry-run endpoints.
6. Evaluate enabled rules in ascending priority order.
7. Stop at the first matching rule.
8. Return deterministic actions before retrieval/Gemini.
9. Persist an audit trace for chat rule evaluations.
10. Add tests for malformed, malicious, missing, and type-mismatched input.

## Request flow

V5 extracts intent and entities, then the chat route builds a rule context.
The rule service validates each condition and performs typed comparisons. A
match returns an action such as escalation or approval. If no rule matches,
the existing retrieval/Gemini path continues.

## Supported actions

- `escalate`
- `require_approval`
- `route_to_team`
- `auto_respond`
- `set_priority`

## Safety behavior

Rule configuration is treated strictly as data. The evaluator does not use
`eval`, `exec`, SQL, shell commands, or dynamic imports. Missing fields and
invalid numeric comparisons are non-matches. Dry-run evaluation is
side-effect-free, while chat evaluation writes an audit record.

## Validation

The full backend suite passed with 23 tests. Ruff, Python compilation,
Compose configuration, Docker startup, migration-head verification, frontend
lint, and frontend production build passed.

## Manual check

1. Create a rule with `POST /api/v1/rules`, for example intent equals
   `order_status` and action `escalate`.
2. Use `POST /api/v1/rules/test` with matching and non-matching contexts.
3. Trigger the matching intent through Chat Preview.
4. Confirm the deterministic action is returned before Gemini.
5. Confirm rule execution metadata is present in the response/audit record.
6. Disable the rule and confirm it no longer fires.
7. Try the same rule from another organization and confirm tenant isolation.

## Boundary

V6 is the last completed version. V7 is planned for ticket management and
human handoff.
