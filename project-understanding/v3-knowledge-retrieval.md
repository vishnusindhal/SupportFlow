# V3 Knowledge Base and Retrieval

> **Current implementation:** ingestion and retrieval were later moved to LangChain
> (`RecursiveCharacterTextSplitter`, Gemini embeddings, `TenantHybridRetriever`).
> This file records V3 as it was built. See [04](./04-knowledge-ingestion.md),
> [05](./05-retrieval.md) and [15](./15-langchain-langgraph.md).

## Goal

V3 turned private company documents into tenant-scoped searchable knowledge.
Supported uploads are PDF, DOCX, and TXT.

## Implementation process

1. Validate extension, MIME type, and file size.
2. Store the upload under an opaque private storage key.
3. Extract text using the appropriate PDF, DOCX, or TXT parser.
4. Split text into approximately 120-word overlapping chunks.
5. Generate a deterministic local 384-dimensional embedding per chunk.
6. Persist the document, chunks, metadata, organization ID, and processing
   status.
7. Add pgvector support and tenant-filtered retrieval.
8. Rank results using lexical overlap and vector similarity.
9. Return focused excerpts and add retry/delete operations.
10. Add the Knowledge Base frontend screen.

## Request flow

An owner/admin uploads a file. The backend validates and processes it, then
stores chunks owned by the authenticated organization. A retrieval request
searches only that organization's chunks. The current score combines about
70% lexical overlap and 30% vector similarity.

## Important implementation areas

- Knowledge routes handle upload, listing, retry, delete, and retrieval.
- Parser and chunking services normalize source content.
- Embedding services create deterministic vectors for local development.
- SQLAlchemy models store documents and chunks.
- Alembic adds vector columns and indexes.

## Validation

Eleven backend tests passed. Ruff, frontend build/lint, and Compose
configuration checks passed.

## Manual check

1. Open `/knowledge`.
2. Upload a small PDF, DOCX, or TXT file.
3. Confirm the document reaches `processed`.
4. Search for a phrase that appears in the file.
5. Confirm the response contains a focused excerpt and source filename.
6. Upload the same type of data under another organization and confirm it is
   not returned to the first organization.
7. Try an unsupported extension and confirm it is rejected.

## Boundary

V3 retrieves evidence; it does not generate an answer with Gemini. Grounded
generation is added in V4.
