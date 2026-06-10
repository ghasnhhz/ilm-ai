"""Flashcard generation from a user's materials via the shared LLM client.

Mirrors the generation half of ``services/quiz.py``: retrieve material chunks
with RAG, ask the LLM for a JSON array of cards, and return them. Cards are
ephemeral — they are delivered to the user (e.g. the Telegram bot) and not
persisted. The LLM call itself is recorded through the usual logging path via
``anthropic_client.complete``.
"""

import json
import re
import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.llm import anthropic_client
from app.services import rag

RETRIEVAL_QUERY = "key concepts definitions terms facts"


def _extract_json(text: str) -> list[dict]:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON array in LLM response: {text[:300]}")
    return json.loads(text[start : end + 1])


@dataclass
class Flashcard:
    front: str
    back: str
    concept: str


def generate_flashcards(
    db: Session,
    user_id: uuid.UUID,
    collection_id: uuid.UUID | None = None,
    n: int = 8,
) -> list[Flashcard]:
    chunks = rag.retrieve(
        db, user_id, RETRIEVAL_QUERY, k=15, collection_id=collection_id
    )
    if not chunks:
        raise ValueError(
            "No study materials found. Upload some materials and wait for them to finish processing."
        )

    context = "\n\n---\n\n".join(
        f"[{c.material_title}]\n{c.content}" for c in chunks[:10]
    )

    system = (
        "You are a precise flashcard generator. "
        "Generate flashcards ONLY from the provided study material. "
        "Return ONLY a valid JSON array — no prose, no markdown fences, just the raw JSON array. "
        "Each element must have exactly these fields:\n"
        '  "front": the prompt side — a question or term, one line\n'
        '  "back": the answer side — a concise definition or explanation\n'
        '  "concept": 1-4 words naming the main concept'
    )
    user_msg = (
        f"Study material:\n\n{context}\n\n"
        f"Generate exactly {n} flashcards covering the most important concepts. "
        "Return only the JSON array."
    )

    result = anthropic_client.complete(
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=2048,
        kind="flashcard_generate",
    )
    items = _extract_json(result.text)

    cards: list[Flashcard] = []
    for item in items:
        front = str(item.get("front", "")).strip()
        back = str(item.get("back", "")).strip()
        if not front or not back:
            continue
        cards.append(
            Flashcard(front=front, back=back, concept=str(item.get("concept", "")).strip())
        )
    return cards
