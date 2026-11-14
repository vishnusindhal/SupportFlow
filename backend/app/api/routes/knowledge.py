import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_context, require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models import CompanyDocument, KnowledgeChunk
from app.services.knowledge import (
    EMBEDDING_DIMENSION,
    EMBEDDING_MODEL,
    EMBEDDING_REVISION,
    embedding_for,
    extract_text,
    save_upload,
    split_text,
)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
Db = Annotated[Session, Depends(get_db)]
Admin = Annotated[AuthContext, Depends(require_roles("owner", "admin"))]
UserContext = Annotated[AuthContext, Depends(get_current_context)]


class RetrievalRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


def serialize_document(document: CompanyDocument) -> dict:
    return {
        "id": str(document.id),
        "original_filename": document.original_filename,
        "mime_type": document.mime_type,
        "size_bytes": document.size_bytes,
        "status": document.status,
        "error_code": document.error_code,
        "created_at": document.created_at,
        "processed_at": document.processed_at,
    }


def process_document(db: Session, document: CompanyDocument, path: Path) -> None:
    try:
        text, metadata = extract_text(path)
        chunks = split_text(text)
        if not chunks:
            raise ValueError("empty_document")
        db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id))
        for index, content in enumerate(chunks):
            db.add(
                KnowledgeChunk(
                    organization_id=document.organization_id,
                    document_id=document.id,
                    chunk_index=index,
                    content=content,
                    embedding=embedding_for(content),
                    metadata_json={
                        **metadata,
                        "source_filename": document.original_filename,
                        "embedding_model": EMBEDDING_MODEL,
                        "embedding_revision": EMBEDDING_REVISION,
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


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    context: Admin,
    db: Db,
    file: Annotated[UploadFile, File(...)],
) -> dict:
    try:
        path, storage_key, size = await save_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    document = CompanyDocument(
        organization_id=context.organization.id,
        original_filename=file.filename or "unknown",
        storage_key=storage_key,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=size,
        status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    process_document(db, document, path)
    return serialize_document(document)


@router.get("/documents")
def list_documents(context: UserContext, db: Db) -> list[dict]:
    documents = db.scalars(
        select(CompanyDocument)
        .where(CompanyDocument.organization_id == context.organization.id, CompanyDocument.deleted_at.is_(None))
        .order_by(CompanyDocument.created_at.desc())
    ).all()
    return [serialize_document(document) for document in documents]


@router.get("/documents/{document_id}")
def get_document(document_id: uuid.UUID, context: UserContext, db: Db) -> dict:
    document = db.scalar(
        select(CompanyDocument).where(
            CompanyDocument.id == document_id,
            CompanyDocument.organization_id == context.organization.id,
            CompanyDocument.deleted_at.is_(None),
        )
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_document(document)


@router.post("/documents/{document_id}/retry")
def retry_document(document_id: uuid.UUID, context: Admin, db: Db) -> dict:
    document = db.scalar(
        select(CompanyDocument).where(
            CompanyDocument.id == document_id,
            CompanyDocument.organization_id == context.organization.id,
            CompanyDocument.deleted_at.is_(None),
        )
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    document.status = "pending"
    db.commit()
    process_document(db, document, Path(get_settings().uploads_dir) / document.storage_key)
    return serialize_document(document)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: uuid.UUID, context: Admin, db: Db) -> None:
    document = db.scalar(
        select(CompanyDocument).where(
            CompanyDocument.id == document_id,
            CompanyDocument.organization_id == context.organization.id,
            CompanyDocument.deleted_at.is_(None),
        )
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id))
    document.deleted_at = datetime.now(UTC)
    db.commit()


@router.post("/retrieve")
def retrieve(request: RetrievalRequest, context: UserContext, db: Db) -> list[dict]:
    query_embedding = embedding_for(request.query)
    query = select(KnowledgeChunk).where(KnowledgeChunk.organization_id == context.organization.id)
    if db.bind and db.bind.dialect.name == "postgresql":
        ranked = db.scalars(
            query.order_by(KnowledgeChunk.embedding.cosine_distance(query_embedding)).limit(request.top_k)
        ).all()
    else:
        chunks = db.scalars(query).all()
        ranked = sorted(
            chunks,
            key=lambda chunk: sum(a * b for a, b in zip(query_embedding, chunk.embedding)),
            reverse=True,
        )[: request.top_k]
    return [
        {
            "chunk_id": str(chunk.id),
            "document_id": str(chunk.document_id),
            "content": chunk.content,
            "metadata": chunk.metadata_json,
            "score": sum(a * b for a, b in zip(query_embedding, chunk.embedding)),
        }
        for chunk in ranked
    ]
