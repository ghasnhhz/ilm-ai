# Ilm AI — TODO & Progress Tracker

> **READ THIS FIRST.** This file is the single source of truth for all AI agents
> working on this project. Before writing a single line of code, read this file
> and `PLAN.md` to understand where we are and what comes next.

## Status Key
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked (reason noted inline)

---

## Current Branch
`main`

## Last Completed Task
Initialised repository and tracking files (PLAN.md, TODO.md, .gitignore).

## Next Task
Start Phase 0: project scaffold (`chore/project-scaffold`).

---

## Phase 0 — Project Scaffold [`chore/project-scaffold`]
- [ ] Create monorepo folder structure (`frontend/`, `backend/`, `bot/`, `infra/`, `docs/`)
- [ ] `backend/app/main.py` — FastAPI app + `GET /health`
- [ ] `backend/app/core/config.py` — pydantic-settings env loader
- [ ] `backend/app/core/db.py` — SQLAlchemy engine/session
- [ ] `backend/requirements.txt` — all backend dependencies pinned
- [ ] `backend/Dockerfile` (python:3.11-slim)
- [ ] `frontend/package.json` + Next.js 14 config files (next, tailwind, postcss, tsconfig)
- [ ] `frontend/app/layout.tsx` + `frontend/app/page.tsx` + `globals.css` (landing page, mobile-first)
- [ ] `frontend/Dockerfile`
- [ ] `bot/` skeleton (`bot/bot/main.py`, `requirements.txt`, `Dockerfile`) with `/start`
- [ ] `infra/db/init.sql` — `CREATE EXTENSION IF NOT EXISTS vector.
- [ ] `docker-compose.yml` — `db`, `backend`, `frontend`, `bot` + healthchecks + volumes
- [ ] `.env.example` — every variable, grouped by service
- [ ] `README.md` — overview, local setup, ASCII architecture diagram, link to PLAN.md
- [ ] Verify `docker compose up` (BLOCKED: Docker not installed locally — verify when available)

## Phase 1 — Auth [`feature/auth`]
- [ ] Models: `users`, `user_goals` (SQLAlchemy)
- [ ] `core/security.py` — bcrypt hashing + JWT encode/decode (access+refresh)
- [ ] `api/deps.py` — `get_current_user` Bearer dependency
- [ ] `POST /auth/register`
- [ ] `POST /auth/login`
- [ ] `GET /auth/me`
- [ ] `PUT /auth/goal` — set learning goal + target date
- [ ] Alembic migration `0001_users`
- [ ] NextAuth config: credentials provider + Google OAuth, JWT session
- [ ] `app/(auth)/signup/page.tsx`
- [ ] `app/(auth)/login/page.tsx`
- [ ] `app/profile/page.tsx` — name/email/goal/target date + placeholder stats
- [ ] `middleware.ts` — protect app routes
- [ ] Verify: register → login → `/auth/me`; Google round-trip; protected redirect

## Phase 2 — Knowledge Base [`feature/knowledge-base`]
- [ ] Models: `collections`, `materials`, `material_chunks` (embedding `vector(1536)` + index)
- [ ] Text extraction: PDF (pypdf), DOCX (python-docx), TXT/paste
- [ ] Chunking service (~512 tokens, 50 overlap)
- [ ] `llm/embeddings.py` + `services/embeddings.py` — batch embed (text-embedding-3-small)
- [ ] `services/storage.py` — S3/Supabase raw file upload
- [ ] `POST /materials/upload` (multipart)
- [ ] `POST /materials/paste`
- [ ] `GET /materials`, `GET /materials/{id}`, `DELETE /materials/{id}`
- [ ] Collection CRUD endpoints
- [ ] Alembic migration `0002_materials`
- [ ] Frontend `/library`: upload zone, collection manager, material list + status
- [ ] Verify: upload PDF → chunks with embeddings, user-scoped; delete cleans up

## Phase 3 — AI Companion [`feature/ai-companion`]
- [ ] Models: `chat_sessions`, `chat_messages` (citations JSON)
- [ ] `services/rag.py` — embed query + top-k cosine search (user-scoped)
- [ ] `llm/anthropic_client.py` — Claude wrapper (model from env, returns usage)
- [ ] `services/companion.py` — Socratic trilingual system prompt + citation + outside-knowledge flag
- [ ] `POST /chat/message`, `GET /chat/history/{session_id}`, `GET /chat/sessions`
- [ ] Alembic migration `0003_chat`
- [ ] Frontend `/chat`: chat window, message bubbles, source-citation chips
- [ ] Verify: grounded answer w/ citation; honest "not in materials"; language match

## Phase 4 — Quiz Mode [`feature/quiz-mode`]
- [ ] Models: `quiz_sessions`, `quiz_questions`, `quiz_answers`
- [ ] `services/quiz.py` — generation (MC/short/open) tagged with concept + source_chunk_id
- [ ] Difficulty modes: gentle / solid / expert
- [ ] Grading: MC exact-match; short/open via Claude w/ rationale + citation
- [ ] `POST /quiz/generate`, `POST /quiz/answer`, `GET /quiz/results/{session_id}`
- [ ] Alembic migration `0004_quiz`
- [ ] Frontend `/quiz`: topic selector, difficulty picker, question display, feedback
- [ ] Verify: grounded questions; correct/incorrect + explanation + citation; score saved

## Phase 5 — Gap Detection [`feature/gap-detection`]
- [ ] `services/gaps.py` — concept wrong ≥2× across ≥2 sessions = gap; strong logic
- [ ] Map gaps → suggested source sections
- [ ] `GET /gaps/{user_id}` → `{ strong, gaps, suggested_sections }`
- [ ] Recompute after each quiz / on page load
- [ ] Frontend `/gaps`: strong-vs-weak breakdown with material links
- [ ] Verify: repeated wrong concept surfaces as gap; report updates with new sessions

## Phase 6 — Learning Plan [`feature/learning-plan`]
- [ ] Model: `learning_plans` (plan_json)
- [ ] Agent tools: `get_knowledge_gaps`, `list_topics`, `get_days_until_goal`, `generate_plan`
- [ ] `services/plan_agent.py` — LangChain agent composing tools → day-by-day plan
- [ ] `POST /plan/generate`, `GET /plan/{user_id}`
- [ ] Regenerate on: new upload / quiz completion / goal date change
- [ ] Alembic migration `0005_plan`
- [ ] Frontend `/plan`: timeline/calendar view mapping materials to days
- [ ] Verify: plan references real materials + current gaps; updates after new quiz/upload

## Phase 7 — Telegram Bot [`feature/telegram-bot`]
- [ ] Backend: link-token endpoint, `telegram_links` model, quiz-for-bot, reminder settings
- [ ] Alembic migration `0006_telegram`
- [ ] Bot `/start` (link via token)
- [ ] Bot `/quiz` (inline 5-question session → records to account)
- [ ] Bot `/reminder HH:MM`
- [ ] Bot `/streak`, `/status`
- [ ] APScheduler: daily reminders + streak increment + celebration
- [ ] Verify: link works; inline quiz records; reminder scheduled; streak increments

## Phase 8 — Payments [`feature/payments`]
- [ ] Models: `subscriptions`, `payment_events`
- [ ] `POST /payments/stripe/checkout`
- [ ] `POST /payments/stripe/webhook` (signature verify → activate)
- [ ] `POST /payments/payme/webhook` (JSON-RPC: CheckPerform/Create/Perform/Cancel/CheckTransaction)
- [ ] `services/limits.py` — free: 3 quizzes/day + 5 uploads; premium: unlimited + priority
- [ ] Alembic migration `0007_payments`
- [ ] Frontend `/pricing` + `/billing` (upgrade/cancel/history)
- [ ] Verify: free limits enforced; test webhook flips premium; Payme protocol responses

## Phase 9 — Monitoring [`feature/monitoring`]
- [ ] Model: `llm_logs` (model, tokens, latency_ms, endpoint)
- [ ] `llm/logging.py` — wrap all Claude + embedding calls
- [ ] Sentry init (backend + frontend) behind `SENTRY_DSN`
- [ ] `GET /admin/metrics` — DAU, quiz completions, uploads, total tokens
- [ ] `docs/eval/` — rubric + ≥50 rated companion samples
- [ ] Verify: each call logs a row; metrics return real counts; eval set complete

## Phase 10 — Deployment [`chore/deployment`]
- [ ] `docker-compose.prod.yml`
- [ ] `.github/workflows/ci.yml` — backend ruff+pytest, frontend eslint+build
- [ ] `.github/workflows/deploy.yml` — deploy on merge to main
- [ ] `DEPLOYMENT.md` — Railway/Render/VPS guide + migrations
- [ ] `docs/smoke-test.md` — end-to-end checklist
- [ ] Verify: CI passes on push; deploy triggers on merge; smoke test passes

---

## Known Issues / Decisions Pending
- **Docker not installed locally** — compose/Dockerfiles written but `docker compose up` unverified until Docker is available. Marked `[!]` in Phase 0.
- **Local Python 3.14-alpha** — backend targets 3.11 in Docker; do not rely on local backend runs for libs lacking 3.14 wheels.
- **LLM model** — default `claude-sonnet-4-6`, overridable via `ANTHROPIC_MODEL`.
- **GitHub repo** — created private under `ghasnhhz`; flip to public for capstone submission.

## Environment Variables Required
> All variables must be in `.env.example`. Never commit real secrets.

| Variable | Description | Required By |
|----------|-------------|-------------|
| DATABASE_URL | PostgreSQL connection string | Backend, Bot |
| ANTHROPIC_API_KEY | Claude API key | Backend |
| ANTHROPIC_MODEL | Claude model id (default claude-sonnet-4-6) | Backend |
| OPENAI_API_KEY | Embeddings (text-embedding-3-small) | Backend |
| JWT_SECRET | Backend JWT signing secret | Backend |
| NEXTAUTH_SECRET | NextAuth signing secret | Frontend |
| NEXTAUTH_URL | NextAuth base URL | Frontend |
| GOOGLE_CLIENT_ID | Google OAuth | Frontend |
| GOOGLE_CLIENT_SECRET | Google OAuth | Frontend |
| TELEGRAM_BOT_TOKEN | Telegram bot | Bot |
| BACKEND_INTERNAL_URL | Backend URL the bot calls | Bot |
| STRIPE_SECRET_KEY | Stripe payments | Backend |
| STRIPE_WEBHOOK_SECRET | Stripe webhook verification | Backend |
| PAYME_MERCHANT_ID | Payme integration | Backend |
| PAYME_SECRET_KEY | Payme integration | Backend |
| NEXT_PUBLIC_API_URL | Backend URL for frontend | Frontend |
| S3_BUCKET | File storage bucket | Backend |
| S3_ENDPOINT | S3/Supabase storage endpoint | Backend |
| S3_ACCESS_KEY | Storage access key | Backend |
| S3_SECRET_KEY | Storage secret key | Backend |
| SUPABASE_URL | Supabase project URL (if used) | Backend |
| SENTRY_DSN | Error tracking | Backend + Frontend |
