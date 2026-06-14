"""Guard the image -> text routing added for S2 multimodal upload.

``extract_text`` gets a new branch: image file types are transcribed to text via
Claude vision (``anthropic_client.transcribe_image``). These tests lock in that
the right media type is passed through and that the existing doc/unsupported
behaviour is unchanged. The vision call itself is mocked — no network, no key.
"""

import pytest

from app.services.ingest import ALL_SUPPORTED_TYPES, IMAGE_TYPES, SUPPORTED_TYPES, extract_text


def test_jpg_routes_to_vision_with_jpeg_media_type(monkeypatch):
    seen = {}

    def fake_transcribe(data, media_type, kind="vision_extract"):
        seen["data"] = data
        seen["media_type"] = media_type
        return "transcribed notes"

    monkeypatch.setattr(
        "app.llm.anthropic_client.transcribe_image", fake_transcribe
    )

    text = extract_text(b"\xff\xd8\xff", "jpg")

    assert text == "transcribed notes"
    assert seen["media_type"] == "image/jpeg"
    assert seen["data"] == b"\xff\xd8\xff"


def test_png_uses_png_media_type(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        "app.llm.anthropic_client.transcribe_image",
        lambda data, media_type, kind="vision_extract": captured.setdefault("mt", media_type) or "ok",
    )

    extract_text(b"\x89PNG", "png")

    assert captured["mt"] == "image/png"


def test_unsupported_type_still_raises():
    with pytest.raises(ValueError):
        extract_text(b"data", "exe")


def test_all_supported_types_covers_docs_and_images():
    assert SUPPORTED_TYPES <= ALL_SUPPORTED_TYPES
    assert IMAGE_TYPES <= ALL_SUPPORTED_TYPES
    assert {"pdf", "txt", "png", "jpg"} <= ALL_SUPPORTED_TYPES
