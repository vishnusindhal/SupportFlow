# Retrieval and Ranking

## The retriever

`TenantHybridRetriever` in `backend/app/services/ai/retriever.py` is a
LangChain `BaseRetriever`. It is used by the chat workflow (`retrieve` node)
and by `POST /api/v1/knowledge/retrieve`, and it returns LangChain
`Document`s with scores and an excerpt in their metadata.

## Query pipeline

1. **Tenant filter first.** Load only chunks where `organization_id` matches
   the authenticated organization. Above 2,000 chunks per tenant on
   PostgreSQL, pgvector narrows to the 200 nearest chunks by cosine distance
   before reranking.
2. **Embed the query** with the same embeddings class used at ingestion.
3. **Lexical score** (`lexical_score` in `services/knowledge.py`): share of
   meaningful query terms (stopwords removed, plurals folded) found in the
   chunk, plus a bonus for matching two-word phrases.
4. **Semantic score:** cosine similarity, rescaled from the model's floor
   (`(cosine - 0.5) / 0.5` for Gemini). Chunks embedded by a different model
   get 0 until re-indexed.
5. **Combine and filter:**

```text
score  = (1 - w) * lexical + w * semantic
w      = 0.5 for Gemini embeddings, 0 for hash embeddings
usable = lexical > 0  OR  semantic >= 0.3
```

6. Return the top `k` documents. The chat workflow asks for usable chunks only
   and cites at most three.

## Focused excerpts

`relevant_excerpt` slides a 45-word window over the chunk, picks the window
with the most query terms, and centers it on the matches. Citations show this
passage instead of the whole chunk.

## Failure behavior

If the embedding API fails at query time, the `retrieve` node swaps in
`HashEmbeddings`, which turns retrieval into word matching only. Chat keeps
working with lower recall.

## Why hybrid ranking

Lexical overlap handles exact names, order IDs and policy terms. Semantic
similarity finds chunks that use different words ("send it back" vs
"return"). The weighted combination is simple, explainable and testable.

## Production improvements

Add an HNSW/IVFFlat index for large tenants, a cross-encoder reranker,
metadata filters (document type, date), and retrieval metrics (Recall@k, MRR)
on the evaluation set. See [16-evaluation-metrics.md](./16-evaluation-metrics.md).

## Manual check

Upload a document containing a unique phrase, query it in **Knowledge base →
Test retrieval**, and verify that the result shows the focused passage and
source filename. Repeat under a second organization and verify the result list
is empty.
