from __future__ import annotations

import hashlib
from datetime import date

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user
from app.database.documents import (
    count_documents_and_chunks,
    insert_document_chunks,
    upsert_source_document,
)
from app.database.models import SourceDocument
from app.database.session import get_db
from app.ingest.chunker import chunk_markdown
from app.ingest.embedder import generate_embeddings
from app.ingest.parser import parse_sec_html

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


class CorpusStatsResponse(BaseModel):
    source_documents: int
    document_chunks: int
    tickers: list[str]


class DocumentUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=10, max_length=2_000_000)
    ticker: str = Field(default="CUSTOM", min_length=1, max_length=16)
    form: str = Field(default="NOTE", min_length=1, max_length=32)
    filing_date: date | None = None
    source_url: str | None = None


class DocumentUploadResponse(BaseModel):
    document_id: str
    ticker: str
    form: str
    filename: str
    chunks_created: int
    total_documents: int
    total_chunks: int


@router.get("/stats", response_model=CorpusStatsResponse)
async def get_corpus_stats(db: Session = Depends(get_db)) -> CorpusStatsResponse:
    """Return live document and chunk counts across the indexed corpus."""
    counts = count_documents_and_chunks(db)
    tickers = list(
        db.scalars(
            select(distinct(SourceDocument.ticker)).order_by(SourceDocument.ticker.asc())
        ).all()
    )
    return CorpusStatsResponse(
        source_documents=counts["source_documents"],
        document_chunks=counts["document_chunks"],
        tickers=tickers,
    )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    payload: DocumentUploadRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    """Parse, chunk, embed with Gemini, and index an uploaded HTML, Markdown, or text document."""
    raw_content = payload.content.strip()
    if not raw_content:
        raise HTTPException(status_code=422, detail="Document content cannot be empty.")

    ticker = payload.ticker.strip().upper()
    form = payload.form.strip().upper()
    filing_dt = payload.filing_date or date.today()

    # Convert HTML documents to clean Markdown; keep Markdown/plain text as-is
    is_html = payload.filename.lower().endswith((".html", ".htm")) or (
        "<html" in raw_content[:500].lower() or "<body" in raw_content[:500].lower()
    )
    markdown_text = parse_sec_html(raw_content) if is_html else raw_content
    if not markdown_text.strip():
        raise HTTPException(status_code=422, detail="No readable text could be extracted from file.")

    content_hash = hashlib.sha256(f"{ticker}:{payload.filename}:{markdown_text}".encode("utf-8")).hexdigest()[:16]
    accession_number = f"UPLOAD-{ticker}-{content_hash}"
    source_url = payload.source_url or f"uploaded://{payload.filename}"

    logger.info(
        "Ingesting uploaded document",
        user_id=user.id,
        filename=payload.filename,
        ticker=ticker,
        form=form,
    )

    doc = upsert_source_document(
        db,
        ticker=ticker,
        form=form,
        filing_date=filing_dt,
        accession_number=accession_number,
        source_url=source_url,
        markdown=markdown_text,
    )

    chunks_data = chunk_markdown(
        markdown_text,
        ticker=ticker,
        form=form,
        filing_date=filing_dt.isoformat(),
        accession_number=accession_number,
    )
    if not chunks_data:
        raise HTTPException(status_code=422, detail="Document produced zero indexable chunks.")

    embeddings = generate_embeddings([c.content for c in chunks_data])
    chunks_to_insert = [
        {
            "chunk_index": c.chunk_index,
            "content": c.content,
            "embedding": emb,
        }
        for c, emb in zip(chunks_data, embeddings, strict=True)
    ]

    inserted = insert_document_chunks(db, doc.id, chunks_to_insert)
    db.commit()

    counts = count_documents_and_chunks(db)
    return DocumentUploadResponse(
        document_id=str(doc.id),
        ticker=ticker,
        form=form,
        filename=payload.filename,
        chunks_created=inserted,
        total_documents=counts["source_documents"],
        total_chunks=counts["document_chunks"],
    )
