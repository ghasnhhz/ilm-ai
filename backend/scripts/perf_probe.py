"""P0 performance probe — black-box timings for the hot endpoints.

Run against a live uvicorn bound to the real Supabase .env so the numbers
include real network round-trips. Prints median/p95 timings for register,
login, upload, and chat. Used to record before/after numbers in PERF_AUDIT.md.

Usage:
    python scripts/perf_probe.py [--base-url http://127.0.0.1:8000] [--n 5]

The LLM slice of the chat request is recorded separately in the ``llm_logs``
table (latency_ms) by the existing logging path; this probe times the full
round-trip the client actually experiences.
"""

from __future__ import annotations

import argparse
import statistics
import time
import uuid

import httpx


def _ms(seconds: float) -> float:
    return round(seconds * 1000, 1)


def _timed(fn):
    start = time.perf_counter()
    resp = fn()
    return _ms(time.perf_counter() - start), resp


def _try(label: str, fn, timeout: float = 60.0):
    """Run a timed call, printing the result immediately so a later failure
    never discards earlier numbers. Returns (ms, response) or (None, None)."""
    try:
        ms, resp = _timed(fn)
        resp.raise_for_status()
        return ms, resp
    except httpx.TimeoutException:
        print(f"{label:<28} TIMEOUT (> {timeout:.0f}s)")
        return None, None
    except Exception as exc:  # noqa: BLE001 - probe should be resilient
        print(f"{label:<28} ERROR {type(exc).__name__}: {exc}")
        return None, None


def _summary(label: str, samples: list[float]) -> str:
    med = statistics.median(samples)
    p95 = max(samples) if len(samples) < 20 else statistics.quantiles(samples, n=20)[18]
    return f"{label:<28} median {med:>8.1f} ms   p95 {p95:>8.1f} ms   (n={len(samples)})"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://127.0.0.1:8000")
    ap.add_argument("--n", type=int, default=5, help="warm samples per endpoint")
    args = ap.parse_args()

    base = args.base_url.rstrip("/")
    client = httpx.Client(base_url=base, timeout=180.0)

    # --- /auth/register (cold + warm) ---
    email = f"perf+{uuid.uuid4().hex[:12]}@example.com"
    password = "Perf-Probe-123!"
    reg_ms, reg = _try(
        "/auth/register (cold)",
        lambda: client.post(
            "/auth/register",
            json={"email": email, "name": "Perf Probe", "password": password},
        ),
    )
    if reg is None:
        return
    token = reg.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    print(f"{'/auth/register (cold)':<28} {reg_ms:>8.1f} ms   (n=1)")

    # --- /auth/login (warm, repeated) ---
    login_samples = []
    for _ in range(args.n):
        t, r = _try(
            "/auth/login",
            lambda: client.post("/auth/login", json={"email": email, "password": password}),
        )
        if t is not None:
            login_samples.append(t)
    if login_samples:
        print(_summary("/auth/login (warm)", login_samples))

    # --- /materials/upload (synchronous ingest in the before-state) ---
    doc = (
        "Photosynthesis is the process by which green plants convert sunlight "
        "into chemical energy. Chlorophyll in the chloroplasts absorbs light. "
    ) * 8
    files = {"file": ("perf.txt", doc.encode("utf-8"), "text/plain")}
    up_ms, up = _try(
        "/materials/upload",
        lambda: client.post("/materials/upload", headers=auth, files=files),
    )
    if up is not None:
        material = up.json()
        print(
            f"{'/materials/upload':<28} {up_ms:>8.1f} ms   status={material.get('status')!r} (n=1)"
        )

    # --- /chat/message (warm, repeated; retrieval + LLM end-to-end) ---
    chat_samples = []
    for _ in range(args.n):
        t, r = _try(
            "/chat/message",
            lambda: client.post(
                "/chat/message",
                headers=auth,
                json={"message": "Explain photosynthesis in one sentence."},
            ),
        )
        if t is not None:
            chat_samples.append(t)
    if chat_samples:
        print(_summary("/chat/message (warm)", chat_samples))


if __name__ == "__main__":
    main()
