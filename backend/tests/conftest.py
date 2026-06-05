"""Shared test fixtures.

These smoke tests must run without Postgres or any API keys, so we force the
offline-safe embedding path and provide a TestClient bound to the real app.
"""

import os

os.environ.setdefault("DEV_FAKE_EMBEDDINGS", "1")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://ilm:ilm@localhost:5432/ilm")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
