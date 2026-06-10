"""Builds the grounded, trilingual Socratic prompt and calls the LLM."""

from collections.abc import Iterator

from app.llm.anthropic_client import ChatResult, generate, stream
from app.services.rag import RetrievedChunk

SNIPPET_CHARS = 300

SYSTEM_PROMPT = """\
You are Ilm, a warm, patient, Socratic learning companion. Guide the learner toward \
understanding with clear explanations and the occasional probing question rather than \
just handing over answers.

Language: detect the language of the learner's message (Uzbek, Russian, or English) and \
reply in that same language.

Grounding rules:
- Answer using ONLY the numbered sources provided in the user's message.
- When you use a source, cite it inline like [Source title, #<chunk index>].
- If the sources do not cover the question, say so honestly and clearly.
- If you add anything from your own general knowledge beyond the sources, prefix that part \
with [Outside knowledge].
Never invent citations or claim something is in the sources when it is not.\
"""


def _context_block(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return "No sources were found in the learner's materials for this question."
    parts = []
    for i, c in enumerate(chunks, start=1):
        parts.append(f"[S{i}] ({c.material_title}, #{c.chunk_index})\n{c.content}")
    return "\n\n".join(parts)


def _citations(chunks: list[RetrievedChunk]) -> list[dict]:
    return [
        {
            "material_id": str(c.material_id),
            "material_title": c.material_title,
            "chunk_index": c.chunk_index,
            "snippet": c.content[:SNIPPET_CHARS],
        }
        for c in chunks
    ]


def _build_messages(query: str, history: list[dict], chunks: list[RetrievedChunk]) -> list[dict]:
    augmented = (
        f"Sources:\n{_context_block(chunks)}\n\n"
        f"Learner's question: {query}"
    )
    return [*history, {"role": "user", "content": augmented}]


def answer(
    query: str,
    history: list[dict],
    chunks: list[RetrievedChunk],
) -> tuple[ChatResult, list[dict]]:
    result = generate(SYSTEM_PROMPT, _build_messages(query, history, chunks))
    return result, _citations(chunks)


def answer_stream(
    query: str,
    history: list[dict],
    chunks: list[RetrievedChunk],
) -> tuple[Iterator[str], list[dict]]:
    """Stream the answer text as deltas; citations are known up front from retrieval."""
    tokens = stream(SYSTEM_PROMPT, _build_messages(query, history, chunks))
    return tokens, _citations(chunks)
