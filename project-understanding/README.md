# SupportFlow Interview Ready Project Understanding

This folder is the interview-ready guide to the complete SupportFlow project.
It explains the product, architecture, implementation process, feature flows,
security decisions, database design, testing, and the reasoning behind each
version. The documents are based on the current source code, not only on the
original specification.

## Recommended reading order

1. [Interview roadmap](./00-interview-roadmap.md)
2. [System architecture](./01-system-architecture.md)
3. [V0–V6 implementation history](#version-files)
4. Feature files for the areas the interviewer asks about
5. [Interview questions and answers](./14-interview-questions.md)

## Version files

Each version has its own file so the implementation can be explained in
chronological order.

| Version | File | Main capability |
|---|---|---|
| V0 | [v0-product-foundation.md](./v0-product-foundation.md) | Product fixtures and UX contract |
| V1 | [v1-authentication-tenancy.md](./v1-authentication-tenancy.md) | Authentication and tenant isolation |
| V2 | [v2-onboarding.md](./v2-onboarding.md) | Templates and onboarding |
| V3 | [v3-knowledge-retrieval.md](./v3-knowledge-retrieval.md) | Private knowledge ingestion and retrieval |
| V4 | [v4-grounded-chat.md](./v4-grounded-chat.md) | Grounded Gemini chat |
| V5 | [v5-conversation-flows.md](./v5-conversation-flows.md) | Configurable deterministic conversation flows |
| V6 | [v6-business-rules.md](./v6-business-rules.md) | Deterministic business rules |
| V7 | [v7-tickets-handoff.md](./v7-tickets-handoff.md) | Ticket management and human handoff |

## Feature files

| Topic | File |
|---|---|
| Architecture and request lifecycle | [01-system-architecture.md](./01-system-architecture.md) |
| Authentication and tenant security | [02-authentication-tenancy.md](./02-authentication-tenancy.md) |
| Templates and onboarding | [03-onboarding-configuration.md](./03-onboarding-configuration.md) |
| File ingestion and document processing | [04-knowledge-ingestion.md](./04-knowledge-ingestion.md) |
| Retrieval and ranking | [05-retrieval.md](./05-retrieval.md) |
| Conversations and Gemini provider | [06-chat-and-gemini.md](./06-chat-and-gemini.md) |
| Conversation state machine | [07-conversation-flows.md](./07-conversation-flows.md) |
| Deterministic rules | [08-business-rules.md](./08-business-rules.md) |
| React frontend | [09-frontend.md](./09-frontend.md) |
| Database and migrations | [10-database-migrations.md](./10-database-migrations.md) |
| API map | [11-api-reference.md](./11-api-reference.md) |
| Docker and local development | [12-docker-development.md](./12-docker-development.md) |
| Tests and validation | [13-testing-validation.md](./13-testing-validation.md) |
| Interview preparation | [14-interview-questions.md](./14-interview-questions.md) |

Every version and feature document includes purpose, implementation details,
request flow, source locations, validation, manual checks, trade-offs, and
limitations.
