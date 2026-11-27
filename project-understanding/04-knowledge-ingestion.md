# Knowledge Base Ingestion

## Supported input

`save_upload` in `backend/app/services/knowledge.py` accepts only:

- PDF with `application/pdf`
- DOCX with the official DOCX MIME type
- TXT with `text/plain`

It reads at most the configured maximum size plus one byte, rejects oversized
files, generates an opaque UUID storage key, and writes under the configured
uploads directory. The original filename is metadata, not the storage path.

## Processing pipeline (LangChain)

`index_document` in `backend/app/services/ai/ingestion.py`:

1. **Load** the stored file into LangChain `Document`s (`load_documents`):
   PyMuPDF gives one `Document` per PDF page with `page` metadata;
   python-docx and UTF-8 reading give one `Document` for DOCX/TXT.
2. **Split** with `RecursiveCharacterTextSplitter` (800 characters, 120
   overlap, separators `\n\n`, `\n`, `. `, space). Whitespace is normalized and
   empty chunks dropped.
3. **Embed** all chunks in one `embeddings.embed_documents` call.
4. **Store** chunks in `knowledge_chunks` with the organization ID, a
   384-dimension vector, and metadata: `source_filename`, `page`,
   `embedding_model`, `embedding_dimension`. Old chunks of the document are
   deleted first, so retry is idempotent.
5. Mark the document `ready` with `processed_at`.
6. On failure (`unsupported_file_type`, `empty_document`, `embedding_failed`),
   roll back, mark it `failed`, and keep the error code for the UI and retry.

## Embeddings

`get_embeddings()` in `llm.py` picks the implementation:

| Condition | Class | Notes |
|---|---|---|
| `GEMINI_API_KEY` set and `EMBEDDING_PROVIDER` is not `hash` | `GeminiEmbeddings` | `gemini-embedding-001` reduced to 384 dimensions and L2-normalized, so the dot product equals cosine similarity |
| Otherwise | `HashEmbeddings` | Deterministic SHA-256 vectors for offline development and tests; not semantic, so retrieval ignores them for ranking |

Each chunk records which model embedded it. After switching models, run
`docker compose exec backend python -m app.scripts.reindex` to re-embed.

## Lifecycle endpoints

- `POST /knowledge/documents`
- `GET /knowledge/documents`
- `GET /knowledge/documents/{id}`
- `POST /knowledge/documents/{id}/retry`
- `DELETE /knowledge/documents/{id}`

Retry reprocesses a failed document. Delete removes the document/chunks from
the tenant's searchable set and cleans up its private file.

## Trade-offs

Processing is synchronous, which keeps the system simple and makes status easy
to understand. Large production uploads should use object storage, background
jobs, virus scanning, extraction timeouts, and a durable processing queue.
LangChain's PGVector store is not used because it manages its own tables
outside the tenant schema.
