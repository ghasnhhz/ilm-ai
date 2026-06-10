"""Text extraction and chunking for uploaded learning materials."""

import io
from dataclasses import dataclass

CHUNK_TOKENS = 512
CHUNK_OVERLAP = 50
_CHARS_PER_TOKEN = 4  # rough fallback when tiktoken is unavailable

SUPPORTED_TYPES = {"pdf", "docx", "txt"}
# Image types are transcribed to text via Claude vision (see extract_text).
IMAGE_TYPES = {"png", "jpg", "jpeg", "webp", "gif"}
_IMAGE_MEDIA_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "gif": "image/gif",
}
# Everything the upload endpoint accepts.
ALL_SUPPORTED_TYPES = SUPPORTED_TYPES | IMAGE_TYPES


@dataclass
class Chunk:
    content: str
    token_count: int


def extract_text(data: bytes, file_type: str) -> str:
    file_type = file_type.lower()
    if file_type == "pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        parts = [(page.extract_text() or "") for page in reader.pages]
        return "\n\n".join(parts)
    if file_type == "docx":
        import docx

        document = docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in document.paragraphs)
    if file_type == "txt":
        return data.decode("utf-8", errors="ignore")
    if file_type in IMAGE_TYPES:
        from app.llm.anthropic_client import transcribe_image

        return transcribe_image(data, _IMAGE_MEDIA_TYPES[file_type])
    raise ValueError(f"Unsupported file type: {file_type}")


def _get_encoder():
    try:
        import tiktoken

        return tiktoken.get_encoding("cl100k_base")
    except Exception:
        return None


def chunk_text(text: str) -> list[Chunk]:
    text = text.strip()
    if not text:
        return []

    encoder = _get_encoder()
    if encoder is not None:
        tokens = encoder.encode(text)
        chunks: list[Chunk] = []
        step = CHUNK_TOKENS - CHUNK_OVERLAP
        for start in range(0, len(tokens), step):
            window = tokens[start : start + CHUNK_TOKENS]
            if not window:
                break
            content = encoder.decode(window).strip()
            if content:
                chunks.append(Chunk(content=content, token_count=len(window)))
            if start + CHUNK_TOKENS >= len(tokens):
                break
        return chunks

    # Character-approximate fallback.
    size = CHUNK_TOKENS * _CHARS_PER_TOKEN
    overlap = CHUNK_OVERLAP * _CHARS_PER_TOKEN
    step = size - overlap
    chunks = []
    for start in range(0, len(text), step):
        content = text[start : start + size].strip()
        if content:
            chunks.append(Chunk(content=content, token_count=max(1, len(content) // _CHARS_PER_TOKEN)))
        if start + size >= len(text):
            break
    return chunks
