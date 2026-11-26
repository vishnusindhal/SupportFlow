"""Factories for the LangChain chat model and embeddings.

All provider details live here, so the rest of the application depends only on
LangChain's `BaseChatModel` and `Embeddings` interfaces.
"""

import math
from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from app.core.config import get_settings
from app.services.knowledge import EMBEDDING_DIMENSION, EMBEDDING_MODEL, embedding_for

HASH_EMBEDDING_MODEL = EMBEDDING_MODEL  # matches chunks indexed before LangChain


class HashEmbeddings(Embeddings):
    """Deterministic local embeddings for offline development and tests.

    They are stable but not semantic: similar meaning does not give similar
    vectors. `GeminiEmbeddings` is used whenever an API key is configured.
    """

    model_name = HASH_EMBEDDING_MODEL
    similarity_floor = 0.0
    # Hash vectors carry no meaning, so they must not influence ranking.
    semantic_weight = 0.0

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [embedding_for(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return embedding_for(text)


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


class GeminiEmbeddings(Embeddings):
    """Gemini embeddings reduced to the 384 dimensions of the existing column.

    Reduced-dimension Gemini vectors are not unit length, so they are
    normalized here; the dot product then equals cosine similarity.
    """

    # Unrelated texts still score around 0.5 cosine with Gemini embeddings, so
    # semantic scores are rescaled from this floor (see retriever.py).
    similarity_floor = 0.5
    semantic_weight = 0.5

    def __init__(self, model: str, api_key: str) -> None:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        self.model_name = f"google/{model}@{EMBEDDING_DIMENSION}"
        self._client = GoogleGenerativeAIEmbeddings(
            model=model,
            google_api_key=api_key,
            output_dimensionality=EMBEDDING_DIMENSION,
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [_normalize(vector) for vector in self._client.embed_documents(texts)]

    def embed_query(self, text: str) -> list[float]:
        return _normalize(self._client.embed_query(text))


@lru_cache
def get_embeddings() -> Embeddings:
    settings = get_settings()
    if settings.embedding_provider != "hash" and settings.gemini_api_key:
        return GeminiEmbeddings(settings.gemini_embedding_model, settings.gemini_api_key)
    return HashEmbeddings()


@lru_cache
def get_chat_model() -> BaseChatModel | None:
    """Return the Gemini chat model, or None when no API key is configured."""
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        timeout=settings.gemini_timeout_seconds,
        # Fail fast and fall back to a human instead of retrying for minutes.
        max_retries=1,
    )
