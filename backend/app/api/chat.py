from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user
from app.chat.messages import ChatStreamRequest
from app.chat.orchestrator import stream_chat_turn
from app.database.session import get_db

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(
    payload: ChatStreamRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream grounded assistant answers, agent status trace, and citations via SSE."""
    return StreamingResponse(
        stream_chat_turn(
            thread_id=payload.threadId,
            messages=payload.messages,
            user=current_user,
            db=db,
            ticker=payload.ticker,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
