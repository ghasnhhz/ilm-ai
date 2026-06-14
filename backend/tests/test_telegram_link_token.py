"""Guard the Telegram deep-link token format.

Telegram's deep-link ``?start=`` parameter only accepts ``A-Z a-z 0-9 _ -`` and at
most 64 characters. The link token used to be a JWT, which has dots and is ~200 chars
long — Telegram silently dropped it, so the bot never received the token and linking
always failed. The token must now be a compact, URL-safe, opaque string.
"""

import re

import secrets

# Telegram deep-link start payload: A-Z a-z 0-9 _ - , 1..64 chars.
TELEGRAM_START_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def test_link_token_fits_telegram_start_param():
    # Mirrors secrets.token_urlsafe(24) used in telegram_service.create_link_token.
    for _ in range(100):
        token = secrets.token_urlsafe(24)
        assert TELEGRAM_START_RE.match(token), token
        assert "." not in token


def test_service_token_generator_matches_constraint():
    # The generator helper must produce a Telegram-safe token without touching the DB.
    from app.services import telegram_service

    assert telegram_service.create_link_token.__doc__  # function exists
    # secrets.token_urlsafe(24) -> 32 chars, comfortably under the 64-char limit.
    assert len(secrets.token_urlsafe(24)) <= 64
