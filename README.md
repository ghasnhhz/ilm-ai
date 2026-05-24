# Ilm AI

**A personal AI learning companion.** You bring your own materials — a textbook
chapter, a course transcript, a research paper, a book, your own notes — and Ilm
AI becomes the tutor for that material. It answers questions grounded in what you
uploaded, quizzes you, explains your mistakes, finds the gaps in your
understanding, and builds a learning plan that fits your life.

> Responds in **Uzbek, Russian, or English** — whichever language you write in.

---

## Architecture

```
                      ┌─────────────────────┐
                      │      Frontend       │
                      │  Next.js 14 (App     │
                      │  Router) + Tailwind  │
                      │  mobile-first, 375px │
                      └──────────┬───────────┘
                                 │ REST + JWT
                                 ▼
        ┌────────────────────────────────────────────┐
        │                  Backend                    │
        │              FastAPI (Python)               │
        │  auth · materials · chat · quiz · gaps ·     │
        │  plan · payments · admin                     │
        │                                              │
        │  services/  rag · companion · quiz ·         │
        │             gaps · plan_agent (LangChain)    │
        │  llm/       Anthropic Claude · embeddings ·  │
        │             call logging                     │
        └───┬───────────────┬───────────────┬─────────┘
            │               │               │
            ▼               ▼               ▼
   ┌────────────────┐ ┌──────────┐ ┌─────────────────┐
   │  PostgreSQL    │ │ Anthropic│ │  OpenAI          │
   │  + pgvector    │ │  Claude  │ │  embeddings      │
   │  (data +       │ │  (LLM)   │ │  (text-embed-3)  │
   │   vectors)     │ └──────────┘ └─────────────────┘
   └────────────────┘
            ▲
            │
   ┌────────┴────────┐      ┌──────────────────────┐
   │  Object storage │      │   Telegram Bot        │
   │  S3 / Supabase  │      │ python-telegram-bot   │
   │  (raw uploads)  │      │ reminders · /quiz ·   │
   └─────────────────┘      │ streaks (calls API)   │
                            └──────────────────────┘

   Payments: Stripe + Payme webhooks → activate premium tier
   Monitoring: Sentry + LLM call logger (tokens, latency, model)
```

## Services

| Service    | Stack                       | Port | Folder      |
|------------|-----------------------------|------|-------------|
| `frontend` | Next.js 14, Tailwind        | 3000 | `frontend/` |
| `backend`  | FastAPI, SQLAlchemy         | 8000 | `backend/`  |
| `db`       | PostgreSQL 16 + pgvector    | 5432 | `infra/db/` |
| `bot`      | python-telegram-bot         | —    | `bot/`      |

## Local development

### Prerequisites
- Docker + Docker Compose (recommended), or local Node 20 / Python 3.11
- Copy env: `cp .env.example .env` and fill in keys (Anthropic, OpenAI, etc.)

### Run everything with Docker
```bash
cp .env.example .env      # then edit .env
docker compose up --build
```
- Frontend → http://localhost:3000
- Backend  → http://localhost:8000  (health: http://localhost:8000/health)
- API docs → http://localhost:8000/docs

### Run services individually (without Docker)
```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Bot
cd bot
pip install -r requirements.txt
python -m bot.main
```

## Project tracking
- **`TODO.md`** — single source of truth for progress. **Read it first.** Every
  phase has a checklist; statuses are kept current as work lands.
- Work proceeds phase-by-phase on feature branches, each merged via PR to `main`.

## Tech & features (MVP)
Auth & profiles · personal knowledge base (RAG) · grounded AI companion chat ·
quiz & practice mode · knowledge gap detection · learning plan agent · Telegram
bot · payments (Stripe + Payme) · monitoring & evaluation.

---
*Ilm AI — because learning is not a phase of life. It is life.*
