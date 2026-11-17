# V7 Ticket Management and Human Handoff

## Goal

V7 added tenant-owned ticket management, human agent handoff, and conversation
escalation integration on top of the V6 deterministic business rules and V5
flows.

## Implementation process

1. Define `Ticket` and `TicketComment` models with tenant scoping and foreign
   keys to conversations and users.
2. Add migration `0007_v7_tickets` for `tickets` and `ticket_comments` tables
   with indexes on tenant, conversation, and assignee IDs.
3. Define strict Pydantic schemas for ticket creation, status updates,
   priorities, team routing, and internal notes.
4. Implement ticket services: listing, creation, status progression, agent
   assignment, and thread notes.
5. Integrate automatic ticket creation in `backend/app/api/routes/chat.py`
   whenever a message triggers an escalation rule (`escalate`, `require_approval`,
   `route_to_team`) or flow handoff (`talk_to_agent`).
6. Add tenant-scoped API routes:
   - `GET /api/v1/tickets`
   - `POST /api/v1/tickets`
   - `GET /api/v1/tickets/{id}`
   - `PATCH /api/v1/tickets/{id}`
   - `POST /api/v1/tickets/{id}/comments`
   - `GET /api/v1/tickets/{id}/comments`
7. Add 6 comprehensive automated tests in `backend/tests/test_tickets.py`
   covering creation, filtering, status resolution, comments, tenant isolation,
   and automatic rule-driven escalation.
8. Connect the React frontend (`frontend/src/features/tickets/TicketsScreen.tsx`)
   with live ticket filtering, status resolution, and internal notes.

## Request flow

When a conversation triggers escalation in `respond()`:
1. The message matches an escalation rule or `talk_to_agent` intent.
2. `escalate_conversation_to_ticket` checks whether an active ticket already
   exists for this conversation and tenant.
3. If not, a new ticket is persisted with title, customer request description,
   priority, team, and context metadata.
4. Support agents view the ticket in **Tickets & Escalations**, can assign
   specialists, add internal notes or public responses, and transition status
   from `open` $\to$ `in_progress` $\to$ `resolved`.

## Supported states and priorities

- **Statuses:** `open`, `in_progress`, `pending`, `resolved`, `closed`.
  Resolving a ticket records a timestamped `resolved_at`.
- **Priorities:** `low`, `normal`, `high`, `urgent`.

## Tenant isolation and safety

- Every ticket and ticket comment query filters strictly on `organization_id`
  derived from the authenticated JWT `AuthContext`.
- A tenant cannot view, update, resolve, or comment on another organization's
  tickets (returns HTTP 404).
- Prompts and customer descriptions are treated purely as data; arbitrary code
  execution is strictly prohibited.

## Validation

- Full backend pytest suite passed with 29 tests (including 6 new V7 tests).
- Ruff check passed with 0 errors.
- Frontend TypeScript check and production build passed with 0 errors.

## Manual check

1. Open `/chat` or `/playground` and send "talk to an agent" or trigger a
   damaged item rule.
2. Confirm the assistant responds that the request is escalated.
3. Open `/tickets` and verify the new ticket appears with status `open`.
4. Click **Inspect**, add an internal agent note, and click **Mark In Progress**.
5. Click **Resolve Ticket** and confirm the status switches to `resolved`.
