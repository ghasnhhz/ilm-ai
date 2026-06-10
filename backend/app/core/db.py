from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# The database is remote (Supabase pooler, far region) so every round-trip is
# expensive. We deliberately do NOT use pool_pre_ping: it adds a full `SELECT 1`
# round-trip (~0.65s here) to every checkout. Instead we recycle connections well
# inside the pooler's idle window and keep TCP keepalives on; stale connections are
# then rare and handled by a one-shot retry on idempotent requests (see app.main).
engine = create_engine(
    settings.database_url,
    pool_pre_ping=False,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=180,
    connect_args={
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
    future=True,
)
# expire_on_commit=False keeps ORM attributes readable after commit without a
# reload round-trip (e.g. user.id for token minting right after register).
SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, future=True
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def warm_pool() -> None:
    """Open one real connection at startup so the first user request doesn't pay
    the ~6s TLS + pooler-auth cost of establishing the first pooled connection."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
