"""Document ingestion: load -> split -> embed -> store, using LangChain types."""

from datetime import UTC, datetime
from pathlib import Path

import fitz
from docx import Document as DocxDocument
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import CompanyDocument, KnowledgeChunk
from app.services.knowledge import EMBEDDING_DIMENSION

CHUNK_SIZE = 800  # characters, about 130 words
CHUNK_OVERLAP = 120

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def load_documents(path: Path) -> list[Document]:
    """Read a stored upload into LangChain Documents (one per PDF page)."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        with fitz.open(path) as pdf:
            page_count = len(pdf)
            return [
                Document(page_content=page.get_text(), metadata={"page": number, "page_count": page_count})
                for number, page in enumerate(pdf, start=1)
            ]
    if suffix == ".docx":
        text = "\n".join(paragraph.text for paragraph in DocxDocument(path).paragraphs)
        return [Document(page_content=text)]
    if suffix == ".txt":
        return [Document(page_content=path.read_text(encoding="utf-8"))]
    raise ValueError("unsupported_file_type")


def split_documents(documents: list[Document]) -> list[Document]:
    chunks = splitter.split_documents(documents)
    for chunk in chunks:
        chunk.page_content = " ".join(chunk.page_content.split())
    return [chunk for chunk in chunks if chunk.page_content]


def index_document(db: Session, document: CompanyDocument, path: Path, embeddings: Embeddings) -> None:
    """Replace a document's chunks; on failure keep an error code for retry."""
    try:
        chunks = split_documents(load_documents(path))
        if not chunks:
            raise ValueError("empty_document")
        try:
            vectors = embeddings.embed_documents([chunk.page_content for chunk in chunks])
        except Exception as exc:  # provider/network errors from the embedding API
            raise RuntimeError("embedding_failed") from exc
        model_name = getattr(embeddings, "model_name", "unknown")
        db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id))
        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
            db.add(
                KnowledgeChunk(
                    organization_id=document.organization_id,
                    document_id=document.id,
                    chunk_index=index,
                    content=chunk.page_content,
                    embedding=vector,
                    metadata_json={
                        **chunk.metadata,
                        "source_filename": document.original_filename,
                        "embedding_model": model_name,
                        "embedding_dimension": EMBEDDING_DIMENSION,
                    },
                )
            )
        document.status = "ready"
        document.error_code = None
        document.processed_at = datetime.now(UTC)
        db.commit()
    except (OSError, ValueError, RuntimeError) as exc:
        db.rollback()
        document.status = "failed"
        document.error_code = str(exc)[:120]
        db.commit()
