from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import (
    admin,
    auth,
    chat,
    collections,
    gaps,
    materials,
    payments,
    plan,
    quiz,
    telegram,
)
from app.core.config import settings
from app.core.context import set_request_endpoint

# Initialise Sentry before the app is created so startup errors are captured too.
# No-op when SENTRY_DSN is unset, so local/dev runs are unaffected.
if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Download and cache the embedding model before accepting requests so it
    # doesn't happen mid-request while a DB session is held open.
    if not settings.dev_fake_embeddings:
        from app.llm.embeddings import embed_texts
        embed_texts(["warmup"])
    yield


app = FastAPI(title=settings.app_name, version=__version__, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _track_endpoint(request: Request, call_next):
    # Seed the request context so llm_logs rows carry the endpoint path.
    # get_current_user fills in the user id later, once auth resolves.
    set_request_endpoint(request.url.path)
    return await call_next(request)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": __version__, "service": settings.app_name}


app.include_router(auth.router)
app.include_router(collections.router)
app.include_router(materials.router)
app.include_router(chat.router)
app.include_router(quiz.router)
app.include_router(gaps.router)
app.include_router(plan.router)
app.include_router(telegram.router)
app.include_router(payments.router)
app.include_router(admin.router)
