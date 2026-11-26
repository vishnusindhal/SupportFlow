"""Tenant-scoped hybrid retriever implemented as a LangChain `BaseRetriever`.

LangChain's PGVector store is deliberately not used: it manages its own tables
outside our schema. This retriever reads the existing `knowledge_chunks` table,
applies the organization filter before any ranking, and combines lexical and
semantic scores.
"""

import uuid
from typing import Any

from langchain_core.callbacks import (
    AsyncCallbackManagerForRetrieverRun,
    CallbackManagerForRetrieverRun,
)
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.retrievers import BaseRetriever
from pydantic import ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import KnowledgeChunk
from app.services.knowledge import lexical_score, relevant_excerpt

# A chunk with no shared words is still usable when it is clearly about the
# same thing (rescaled semantic score; about 0.65 cosine for Gemini vectors).
SEMANTIC_USABLE = 0.3
# Above this many chunks, pgvector narrows the candidates before reranking.
FULL_SCAN_LIMIT = 2000
CANDIDATE_POOL = 200


class TenantHybridRetriever(BaseRetriever):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Session
    organization_id: uuid.UUID
    embeddings: Embeddings
    k: int = 5
    only_usable: bool = False

    def _candidates(self, query_vector: list[float]) -> list[KnowledgeChunk]:
        tenant = select(KnowledgeChunk).where(KnowledgeChunk.organization_id == self.organization_id)
        dialect = self.db.bind.dialect.name if self.db.bind else ""
        if dialect == "postgresql":
            total = self.db.scalar(
                select(func.count())
                .select_from(KnowledgeChunk)
                .where(KnowledgeChunk.organization_id == self.organization_id)
            )
            if total and total > FULL_SCAN_LIMIT:
                return list(
                    self.db.scalars(
                        tenant.order_by(KnowledgeChunk.embedding.cosine_distance(query_vector)).limit(CANDIDATE_POOL)
                    )
                )
        return list(self.db.scalars(tenant))

    def _rank(self, query: str, query_vector: list[float]) -> list[Document]:
        model_name = getattr(self.embeddings, "model_name", "")
        floor = getattr(self.embeddings, "similarity_floor", 0.0)
        semantic_weight = getattr(self.embeddings, "semantic_weight", 0.5)
        scored = []
        for chunk in self._candidates(query_vector):
            lexical = lexical_score(query, chunk.content)
            semantic = 0.0
            # Vectors from a different embedding model are not comparable;
            # such chunks are ranked by words only until they are re-indexed.
            if chunk.metadata_json.get("embedding_model") == model_name:
                cosine = sum(a * b for a, b in zip(query_vector, chunk.embedding))
                semantic = min(1.0, max(0.0, (cosine - floor) / (1 - floor)))
            usable = lexical > 0 or (semantic_weight > 0 and semantic >= SEMANTIC_USABLE)
            if self.only_usable and not usable:
                continue
            score = (1 - semantic_weight) * lexical + semantic_weight * semantic
            scored.append((score, lexical, semantic, usable, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            Document(
                page_content=chunk.content,
                metadata={
                    **chunk.metadata_json,
                    "chunk_id": str(chunk.id),
                    "document_id": str(chunk.document_id),
                    "score": round(score, 4),
                    "lexical_score": round(lexical, 4),
                    "semantic_score": round(semantic, 4),
                    "usable": usable,
                    "excerpt": relevant_excerpt(query, chunk.content),
                },
            )
            for score, lexical, semantic, usable, chunk in scored[: self.k]
        ]

    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> list[Document]:
        return self._rank(query, self.embeddings.embed_query(query))

    async def _aget_relevant_documents(
        self, query: str, *, run_manager: AsyncCallbackManagerForRetrieverRun, **kwargs: Any
    ) -> list[Document]:
        # Only the embedding call leaves the event loop; the database session is
        # used on the calling thread.
        return self._rank(query, await self.embeddings.aembed_query(query))
