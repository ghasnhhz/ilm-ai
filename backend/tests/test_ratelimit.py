import time

from app.core.ratelimit import SlidingWindowLimiter, reset


def test_allows_up_to_budget_then_blocks():
    reset()
    limiter = SlidingWindowLimiter(max_attempts=3, window_seconds=60.0)
    assert [limiter.allow("k") for _ in range(4)] == [True, True, True, False]


def test_separate_keys_have_separate_budgets():
    reset()
    limiter = SlidingWindowLimiter(max_attempts=1, window_seconds=60.0)
    assert limiter.allow("a") is True
    assert limiter.allow("b") is True  # different key, own budget
    assert limiter.allow("a") is False


def test_window_recovers_after_expiry():
    reset()
    limiter = SlidingWindowLimiter(max_attempts=1, window_seconds=0.05)
    assert limiter.allow("k") is True
    assert limiter.allow("k") is False
    time.sleep(0.06)
    assert limiter.allow("k") is True
