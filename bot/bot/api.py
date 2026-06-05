"""Thin httpx client for the Ilm AI backend.

The bot is a trusted server-side service: it authenticates to the backend with the
shared `X-Telegram-Secret` header and identifies users by their Telegram `chat_id`.
"""

import os

import httpx

BACKEND_URL = os.environ.get("BACKEND_INTERNAL_URL", "http://backend:8000").rstrip("/")
BOT_SECRET = os.environ.get("TELEGRAM_BOT_SECRET", "")

_HEADERS = {"X-Telegram-Secret": BOT_SECRET}
_TIMEOUT = httpx.Timeout(30.0)


class BackendError(Exception):
    """Raised when the backend returns a non-2xx response; message is user-friendly."""


async def _request(method: str, path: str, **kwargs) -> dict | list:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.request(
            method, f"{BACKEND_URL}{path}", headers=_HEADERS, **kwargs
        )
    if resp.status_code >= 400:
        detail = resp.text
        try:
            detail = resp.json().get("detail", detail)
        except Exception:
            pass
        raise BackendError(detail)
    if resp.status_code == 204:
        return {}
    return resp.json()


async def link(token: str, chat_id: int) -> dict:
    return await _request("POST", "/telegram/link", json={"token": token, "chat_id": chat_id})


async def status(chat_id: int) -> dict:
    return await _request("GET", "/telegram/status", params={"chat_id": chat_id})


async def quiz_generate(chat_id: int) -> dict:
    return await _request("POST", "/telegram/quiz/generate", json={"chat_id": chat_id})


async def quiz_answer(chat_id: int, question_id: str, answer: str) -> dict:
    return await _request(
        "POST",
        "/telegram/quiz/answer",
        json={"chat_id": chat_id, "question_id": question_id, "answer": answer},
    )


async def set_reminder(chat_id: int, hour: int | None, minute: int | None) -> dict:
    return await _request(
        "POST",
        "/telegram/reminder",
        json={"chat_id": chat_id, "hour": hour, "minute": minute},
    )


async def reminders_due() -> list:
    return await _request("GET", "/telegram/reminders/due")
