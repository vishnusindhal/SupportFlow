# Knowledge Base Ingestion

## Supported input

The upload service accepts only:

- PDF with `application/pdf`
- DOCX with the official DOCX MIME type
- TXT with `text/plain`

It reads at most the configured maximum size plus one byte, rejects oversized
files, generates an opaque UUID storage key, and writes under the configured
uploads directory. The original filename is metadata, not the storage path.

## Processing pipeline

1. Create a `company_documents` row with processing status.
2. Validate and save the upload.
3. Extract text using PyMuPDF, python-docx, or UTF-8 text reading.
4. Normalize whitespace and split into 120-word chunks with 20-word overlap.
5. Generate one deterministic 384-dimensional normalized vector per chunk.
6. Store chunks with source metadata and organization ID.
7. Mark the document processed and set `processed_at`.
8. On failure, keep an error code so the UI/API can report it.

## Why deterministic embeddings

V3 needed a provider-independent implementation that could run in tests and
local development without an external embedding API. The hash-based embedding
is stable for the same text and dimension, but it is a prototype-quality
embedding and should be replaced by a semantic model for production.

## Lifecycle endpoints

- `POST /knowledge/documents`
- `GET /knowledge/documents`
- `GET /knowledge/documents/{id}`
- `POST /knowledge/documents/{id}/retry`
- `DELETE /knowledge/documents/{id}`

Retry reprocesses a failed document. Delete removes the document/chunks from
the tenant's searchable set and cleans up its private file.

## Interview trade-offs

Processing is synchronous, which keeps the prototype simple and makes status
easy to understand. Large production uploads should use object storage,
background jobs, virus scanning, extraction timeouts, and a durable processing
queue.
