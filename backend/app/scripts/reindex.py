"""Re-embed documents whose chunks were created with a different embedding model.

Run after switching embedding models (for example from the local hash
embeddings to Gemini):

    docker compose exec backend python -m app.scripts.reindex
"""

from pathlib import Path

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import CompanyDocument, KnowledgeChunk
from app.services.ai.ingestion import index_document
from app.services.ai.llm import get_embeddings


def main() -> None:
    embeddings = get_embeddings()
    current = getattr(embeddings, "model_name", "unknown")
    uploads = Path(get_settings().uploads_dir)
    print(f"Embedding model: {current}")
    with SessionLocal() as db:
        documents = db.scalars(select(CompanyDocument).where(CompanyDocument.deleted_at.is_(None))).all()
        updated = skipped = failed = missing = 0
        for document in documents:
            chunk = db.scalar(select(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id).limit(1))
            if document.status == "ready" and chunk and chunk.metadata_json.get("embedding_model") == current:
                skipped += 1
                continue
            path = uploads / document.storage_key
            if not path.exists():
                # Leave the document as it is: its existing chunks still work
                # for word search. Re-upload it to get new embeddings.
                missing += 1
                print(f"  original file missing, re-upload to re-embed: {document.original_filename}")
                continue
            index_document(db, document, path, embeddings)
            if document.status == "ready":
                updated += 1
            else:
                failed += 1
                print(f"  failed: {document.original_filename} ({document.error_code})")
        print(f"Re-indexed {updated}, already current {skipped}, file missing {missing}, failed {failed}")


if __name__ == "__main__":
    main()
