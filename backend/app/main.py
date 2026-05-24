from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import auth, chat, collections, materials
from app.core.config import settings

app = FastAPI(title=settings.app_name, version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": __version__, "service": settings.app_name}


app.include_router(auth.router)
app.include_router(collections.router)
app.include_router(materials.router)
app.include_router(chat.router)
# Later phases register their routers here:
# from app.api import quiz, gaps, plan, payments, admin, telegram
