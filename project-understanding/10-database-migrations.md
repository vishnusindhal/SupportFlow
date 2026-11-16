# Database and Migration Design

## Migration sequence

| Migration | Schema capability |
|---|---|
| `0001_v1_auth_tables` | Users, organizations, memberships, refresh sessions |
| `0002_v2_templates` | Industry templates and company configuration |
| `0003_v3_knowledge` | Documents, chunks, and embedding support |
| `0004_v4_chat` | Conversations, messages, and LLM usage |
| `0005_v5_flows` | Tenant conversation flows and chat state fields |
| `0006_v6_rules` | Company rules and rule execution logs |

## Main entities

- `users` and `organizations` define identities and tenants.
- `memberships` connects users to organizations with roles/status.
- `refresh_sessions` stores hashed rotating refresh tokens.
- `industry_templates` stores reusable versioned configurations.
- `company_configs` stores tenant snapshots.
- `company_documents` stores upload metadata and processing status.
- `knowledge_chunks` stores source text, metadata, and 384-dimensional vectors.
- `conversations` and `messages` store support interactions.
- `llm_usage` stores provider observability.
- `conversation_flows` stores tenant state-machine definitions.
- `company_rules` and `rule_execution_logs` store deterministic policy logic.

## Type choices

UUIDs identify records. JSON stores evolving configuration, metadata, context,
entities, and traces. PostgreSQL uses pgvector for embeddings; the custom
`EmbeddingType` falls back to JSON for SQLite tests.

## Migration workflow

The backend container runs `alembic upgrade head` before Uvicorn. Local
development can run `alembic upgrade head` directly with `DATABASE_URL`.
Schema changes should be additive, reversible where practical, and tested
against both the application and migration head.

## Interview question

**Why keep embeddings in a relational database?**  
The chunk still belongs to a document and tenant, so relational filtering and
vector similarity need to work together. pgvector keeps metadata ownership and
semantic search in one database boundary.
