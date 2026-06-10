import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.llm.anthropic_client import AnthropicUnavailableError
from app.models.chat import ChatMessage, ChatSession
from app.models.user import User
from app.schemas.chat import (
    ChatMessageOut,
    HistoryOut,
    MessageRequest,
    MessageResponse,
    SessionOut,
)
from app.services import companion
from app.services.rag import retrieve

router = APIRouter(prefix="/chat", tags=["chat"])

TITLE_MAX = 60


def _get_owned_session(db: Session, user: User, session_id: uuid.UUID) -> ChatSession:
    session = db.scalar(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == user.id
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.post("/message", response_model=MessageResponse)
def send_message(
    payload: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    session: ChatSession | None = None
    history: list[dict] = []
    if payload.session_id is not None:
        session = _get_owned_session(db, current_user, payload.session_id)
        history = [{"role": m.role, "content": m.content} for m in session.messages]

    chunks = retrieve(
        db, current_user.id, payload.message, collection_id=payload.collection_id
    )
    try:
        result, citations = companion.answer(payload.message, history, chunks)
    except AnthropicUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    if session is None:
        session = ChatSession(
            user_id=current_user.id,
            title=(payload.message.strip()[:TITLE_MAX] or None),
        )
        db.add(session)
        db.flush()

    db.add(
        ChatMessage(
            session_id=session.id,
            user_id=current_user.id,
            role="user",
            content=payload.message,
        )
    )
    assistant_msg = ChatMessage(
        session_id=session.id,
        user_id=current_user.id,
        role="assistant",
        content=result.text,
        citations=citations or None,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return MessageResponse(
        session_id=session.id,
        message=ChatMessageOut.model_validate(assistant_msg),
    )


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/message/stream")
def send_message_stream(
    payload: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Same as /message but streams the answer token-by-token over SSE so the UI
    shows the first token fast. Persists the exchange once the stream completes."""
    session: ChatSession | None = None
    history: list[dict] = []
    if payload.session_id is not None:
        session = _get_owned_session(db, current_user, payload.session_id)
        history = [{"role": m.role, "content": m.content} for m in session.messages]

    chunks = retrieve(
        db, current_user.id, payload.message, collection_id=payload.collection_id
    )
    tokens, citations = companion.answer_stream(payload.message, history, chunks)

    def event_stream():
        nonlocal session
        # Citations are known from retrieval up front; send them before the text.
        yield _sse({"type": "citations", "citations": citations})
        parts: list[str] = []
        try:
            for delta in tokens:
                parts.append(delta)
                yield _sse({"type": "delta", "text": delta})
        except AnthropicUnavailableError as exc:
            yield _sse({"type": "error", "detail": str(exc)})
            return

        full = "".join(parts)
        if session is None:
            session = ChatSession(
                user_id=current_user.id,
                title=(payload.message.strip()[:TITLE_MAX] or None),
            )
            db.add(session)
            db.flush()
        db.add(
            ChatMessage(
                session_id=session.id, user_id=current_user.id,
                role="user", content=payload.message,
            )
        )
        assistant_msg = ChatMessage(
            session_id=session.id, user_id=current_user.id,
            role="assistant", content=full, citations=citations or None,
        )
        db.add(assistant_msg)
        db.commit()
        yield _sse(
            {"type": "done", "session_id": str(session.id), "message_id": str(assistant_msg.id)}
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    rows = db.scalars(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    ).all()
    return [SessionOut.model_validate(s) for s in rows]


@router.get("/history/{session_id}", response_model=HistoryOut)
def get_history(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HistoryOut:
    session = _get_owned_session(db, current_user, session_id)
    return HistoryOut(
        session_id=session.id,
        messages=[ChatMessageOut.model_validate(m) for m in session.messages],
    )
