import hashlib
import math
import re
import uuid
from itertools import pairwise
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings

EMBEDDING_DIMENSION = 384
EMBEDDING_MODEL = "supportflow-hash-embedding"
ALLOWED_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
}


def embedding_for(text: str) -> list[float]:
    values = []
    for index in range(EMBEDDING_DIMENSION):
        digest = hashlib.sha256(f"{index}:{text}".encode()).digest()
        values.append((int.from_bytes(digest[:4], "big") / 2**32) * 2 - 1)
    norm = math.sqrt(sum(value * value for value in values)) or 1
    return [value / norm for value in values]


# Common words carry no meaning for matching. Without this list, "how", "does"
# or "the" make unrelated chunks look relevant.
STOPWORDS = {
    "a", "about", "after", "all", "also", "am", "an", "and", "any", "are", "as", "at", "be",
    "been", "before", "but", "by", "can", "could", "did", "do", "does", "doing", "for", "from",
    "get", "got", "had", "has", "have", "how", "i", "if", "in", "into", "is", "it", "its",
    "just", "let", "me", "might", "much", "my", "need", "of", "on", "or", "our", "please",
    "should", "so", "some", "tell", "than", "that", "the", "their", "them", "then", "there",
    "these", "they", "this", "those", "to", "too", "us", "was", "we", "were", "what", "when",
    "where", "which", "who", "why", "will", "with", "would", "you", "your",
}


def _stem(term: str) -> str:
    # Minimal plural folding so "costs" matches "cost" and "returns" matches "return".
    return term[:-1] if len(term) > 3 and term.endswith("s") and not term.endswith("ss") else term


def terms_of(text: str) -> set[str]:
    return {_stem(term) for term in re.findall(r"[a-z0-9]+", text.lower())}


def query_terms(text: str) -> set[str]:
    return {_stem(term) for term in re.findall(r"[a-z0-9]+", text.lower()) if term not in STOPWORDS}


def _content_sequence(text: str) -> list[str]:
    return [_stem(term) for term in re.findall(r"[a-z0-9]+", text.lower()) if term not in STOPWORDS]


def _bigrams(sequence: list[str]) -> set[tuple[str, str]]:
    return set(pairwise(sequence))


def lexical_score(query: str, content: str) -> float:
    """Share of query terms found in the content, plus a bonus for matching phrases.

    The phrase bonus breaks ties between chunks that share the same words: for
    "physical stores", a chunk saying "physical stores" beats one saying
    "physical damage ... Northstar Store".
    """
    terms = query_terms(query)
    if not terms:
        return 0.0
    base = len(terms & terms_of(content)) / len(terms)
    query_pairs = _bigrams(_content_sequence(query))
    if not query_pairs:
        return base
    phrase = len(query_pairs & _bigrams(_content_sequence(content))) / len(query_pairs)
    return (base + 0.3 * phrase) / 1.3


def relevant_excerpt(query: str, content: str, window_words: int = 45) -> str:
    """Return the window of the chunk that contains the most query terms."""
    words = content.split()
    terms = query_terms(query)
    if len(words) <= window_words or not terms:
        return content
    hits = [
        1 if terms & terms_of(word) else 0
        for word in words
    ]
    best_start, best_hits = 0, sum(hits[:window_words])
    current = best_hits
    for start in range(1, len(words) - window_words + 1):
        current += hits[start + window_words - 1] - hits[start - 1]
        if current > best_hits:
            best_start, best_hits = start, current
    # Center the window on the matches it contains, so the excerpt shows the
    # text around them instead of ending at the matched word.
    positions = [i for i in range(best_start, best_start + window_words) if hits[i]]
    if positions:
        center = (positions[0] + positions[-1]) // 2
        best_start = min(max(0, center - window_words // 2), len(words) - window_words)
    return " ".join(words[best_start : best_start + window_words])


async def save_upload(upload: UploadFile) -> tuple[Path, str, int]:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in ALLOWED_TYPES or upload.content_type != ALLOWED_TYPES[suffix]:
        raise ValueError("unsupported_file_type")
    data = await upload.read(get_settings().max_upload_size_bytes + 1)
    if len(data) > get_settings().max_upload_size_bytes:
        raise ValueError("file_too_large")
    key = f"{uuid.uuid4().hex}{suffix}"
    directory = Path(get_settings().uploads_dir)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / key
    path.write_bytes(data)
    return path, key, len(data)
