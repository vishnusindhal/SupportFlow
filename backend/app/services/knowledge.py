import hashlib
import math
import re
import uuid
from pathlib import Path

import fitz
from docx import Document as DocxDocument
from fastapi import UploadFile

from app.core.config import get_settings

EMBEDDING_DIMENSION = 384
EMBEDDING_MODEL = "supportflow-hash-embedding"
EMBEDDING_REVISION = "v1"
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


def split_text(text: str, chunk_words: int = 120, overlap_words: int = 20) -> list[str]:
    words = re.findall(r"\S+", re.sub(r"\s+", " ", text).strip())
    if not words:
        return []
    chunks = []
    step = max(1, chunk_words - overlap_words)
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_words])
        if chunk:
            chunks.append(chunk)
        if start + chunk_words >= len(words):
            break
    return chunks


def lexical_score(query: str, content: str) -> float:
    query_terms = set(re.findall(r"[a-z0-9]+", query.lower()))
    content_terms = set(re.findall(r"[a-z0-9]+", content.lower()))
    if not query_terms:
        return 0.0
    return len(query_terms & content_terms) / len(query_terms)


def relevant_excerpt(query: str, content: str, window_words: int = 45) -> str:
    words = content.split()
    query_terms = set(re.findall(r"[a-z0-9]+", query.lower()))
    for index, word in enumerate(words):
        terms = re.findall(r"[a-z0-9]+", word.lower())
        if terms and terms[0] in query_terms:
            start = max(0, index - window_words // 2)
            return " ".join(words[start : min(len(words), start + window_words)])
    return content


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


def extract_text(path: Path) -> tuple[str, dict]:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return path.read_text(encoding="utf-8"), {}
    if suffix == ".pdf":
        pdf = fitz.open(path)
        pages = [page.get_text() for page in pdf]
        return "\n".join(pages), {"page_count": len(pages)}
    if suffix == ".docx":
        document = DocxDocument(path)
        return "\n".join(paragraph.text for paragraph in document.paragraphs), {}
    raise ValueError("unsupported_file_type")
