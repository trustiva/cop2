import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.assistant.outputs import SourcePassage
from app.auth.dependencies import CurrentUser, get_current_user
from app.database import chats
from app.database.models import ChatMessage
from app.database.session import get_db

router = APIRouter(prefix="/threads", tags=["threads"])


class ThreadCreate(BaseModel):
    title: str | None = None


class ThreadResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CitationResponse(BaseModel):
    id: uuid.UUID
    chunk_id: uuid.UUID
    quote: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: uuid.UUID
    thread_id: uuid.UUID
    role: str
    content: str
    created_at: datetime
    citations: list[CitationResponse] = []
    cited_passages: list[SourcePassage] = []

    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    content: str


def _serialize_message(msg: ChatMessage) -> MessageResponse:
    """Serialize a ChatMessage including full cited_passages for passage inspection."""
    citations_out: list[CitationResponse] = []
    passages_out: list[SourcePassage] = []
    seen_chunks: set[uuid.UUID] = set()

    for c in msg.citations:
        citations_out.append(
            CitationResponse(id=c.id, chunk_id=c.chunk_id, quote=c.quote)
        )
        if c.chunk_id not in seen_chunks and c.chunk is not None and c.chunk.document is not None:
            seen_chunks.add(c.chunk_id)
            doc = c.chunk.document
            passages_out.append(
                SourcePassage(
                    chunk_id=c.chunk.id,
                    document_id=doc.id,
                    chunk_index=c.chunk.chunk_index,
                    ticker=doc.ticker,
                    form=doc.form,
                    filing_date=doc.filing_date.isoformat(),
                    accession_number=doc.accession_number,
                    source_url=doc.source_url,
                    content=c.chunk.content,
                )
            )

    return MessageResponse(
        id=msg.id,
        thread_id=msg.thread_id,
        role=msg.role,
        content=msg.content,
        created_at=msg.created_at,
        citations=citations_out,
        cited_passages=passages_out,
    )


@router.get("", response_model=list[ThreadResponse])
async def list_threads(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all threads owned by the authenticated user."""
    return chats.list_user_threads(db, user_id=user.id)


@router.post("", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(
    body: ThreadCreate | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new chat thread for the authenticated user."""
    title = body.title if body else None
    return chats.create_user_thread(db, user_id=user.id, title=title)


@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific thread, ensuring it belongs to the authenticated user."""
    thread = chats.get_user_thread(db, thread_id=thread_id, user_id=user.id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a thread owned by the authenticated user."""
    deleted = chats.delete_user_thread(db, thread_id=thread_id, user_id=user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Thread not found")
    return None


@router.get("/{thread_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    thread_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all messages in a thread, enforcing user ownership."""
    messages = chats.list_thread_messages(db, thread_id=thread_id, user_id=user.id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return [_serialize_message(m) for m in messages]


@router.post("/{thread_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    thread_id: uuid.UUID,
    body: MessageCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Post a message into a thread, enforcing ownership."""
    thread = chats.get_user_thread(db, thread_id=thread_id, user_id=user.id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message content cannot be empty")

    user_msg = chats.create_thread_message(
        db, thread=thread, role="user", content=content
    )

    # Auto-generate a thread title from the first message if still default
    if thread.title in ("New Chat", "New Research Chat"):
        thread.title = content[:30] + ("..." if len(content) > 30 else "")
        db.commit()

    return _serialize_message(user_msg)
