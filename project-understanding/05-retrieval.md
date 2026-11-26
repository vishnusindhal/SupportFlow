# Retrieval and Ranking

> **Branch `feature/langchain`:** retrieval is a LangChain `BaseRetriever` with Gemini embeddings. See [15-langchain-langgraph.md](./15-langchain-langgraph.md).

## Query pipeline

`POST /api/v1/knowledge/retrieve` accepts a query and optional `top_k`.

1. Load only chunks belonging to the authenticated organization.
2. Generate the same 384-dimensional query embedding.
3. Calculate lexical overlap between query terms and chunk terms.
4. Calculate vector similarity using the embedding dot product.
5. Rank with:

```text
score = 0.7 * lexical_overlap + 0.3 * vector_similarity
```

6. Return the best chunks with source metadata and focused excerpts.

## Focused excerpts

`relevant_excerpt` locates the first matching query term and returns a bounded
window of roughly 45 words around it. If no term is found, the chunk is
returned. This prevents a question about one project from displaying an entire
resume or document.

## Why hybrid ranking

Lexical overlap handles exact names such as `Eventopia` and order IDs well.
Vector similarity helps when the query and source use related wording. The
weighted combination is simple, explainable, and suitable for the prototype.

## Production improvements

Use a real embedding model, PostgreSQL vector indexes, metadata filters,
reranking, document versioning, chunk quality evaluation, and retrieval
precision/recall metrics. Keep the organization filter outside the model and
apply it before ranking.

## Manual check

Upload a document containing a unique project name, search for that name, and
verify that the response contains only the focused passage and source
filename. Repeat with a second tenant to verify isolation.
