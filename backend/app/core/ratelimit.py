"""Tiny in-memory sliding-window rate limiter.

Used to throttle brute-force-prone endpoints (e.g. /auth/login). This is intentionally
dependency-free: state lives in this process, so it resets on restart and is per-worker.
That's acceptable for the current single-instance deployment; swap for a Redis-backed
limiter if the API is ever scaled horizontally.
"""

import threading
import time
from collections import defaultdict, deque

_lock = threading.Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


class SlidingWindowLimiter:
    def __init__(self, max_attempts: int, window_seconds: float) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds

    def allow(self, key: str) -> bool:
        """Record an attempt for `key`; return False if it exceeds the window budget."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with _lock:
            bucket = _hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= self.max_attempts:
                return False
            bucket.append(now)
            return True


def reset() -> None:
    """Clear all recorded attempts (used by tests)."""
    with _lock:
        _hits.clear()


# Login: at most 5 attempts per minute per (ip, email).
login_limiter = SlidingWindowLimiter(max_attempts=5, window_seconds=60.0)
