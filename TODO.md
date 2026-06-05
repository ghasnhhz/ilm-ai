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
`feature/payments`

## Last Completed Task
Phase 8 — Payments & Premium tier (`Subscription`/`PaymentEvent`/`PaymeTransaction` models + Alembic `0007_payments`; `services/limits.py` is_premium/get_usage/check_quiz_limit/check_upload_limit/activate_premium/deactivate — free caps 3 quizzes/day + 5 uploads, enforced as HTTP 402 in quiz generate, materials upload/paste, and bot quiz; `services/stripe_service.py` Checkout + signature-verified webhook idempotent on event id; `services/payme_service.py` full JSON-RPC merchant protocol CheckPerform/Create/Perform/Cancel/CheckTransaction with Payme error codes + Basic-auth; `api/payments.py` checkout/webhooks/usage/cancel/history; config + `.env.example` STRIPE_PRICE_ID/PREMIUM_AMOUNT_UZS/PREMIUM_PRICE_LABEL/APP_BASE_URL; frontend `/pricing` + `/billing` pages, Billing nav link, 402 upgrade affordance on quiz). Frontend `npm run build` + `tsc` pass; backend `py_compile` passes; Stripe e2e (test mode) + Payme (protocol only) deferred — no keys/Postgres locally.

## Next Task
Start Phase 9: Monitoring (`feature/monitoring`).

---

## Phase 0 — Project Scaffold [`chore/project-scaffold`]
- [x] Create monorepo folder structure (`frontend/`, `backend/`, `bot/`, `infra/`, `docs/`)
- [x] `backend/app/main.py` — FastAPI app + `GET /health`
- [x] `backend/app/core/config.py` — pydantic-settings env loader
- [x] `backend/app/core/db.py` — SQLAlchemy engine/session
- [x] `backend/requirements.txt` — all backend dependencies pinned
- [x] `backend/Dockerfile` (python:3.11-slim)
- [x] `frontend/package.json` + Next.js 14 config files (next, tailwind, postcss, tsconfig)
- [x] `frontend/app/layout.tsx` + `frontend/app/page.tsx` + `globals.css` (landing page, mobile-first)
- [x] `frontend/Dockerfile`
- [x] `bot/` skeleton (`bot/bot/main.py`, `requirements.txt`, `Dockerfile`) with `/start`
- [x] `infra/db/init.sql` — `CREATE EXTENSION IF NOT EXISTS vector;`
- [x] `docker-compose.yml` — `db`, `backend`, `frontend`, `bot` + healthchecks + volumes
- [x] `.env.example` — every variable, grouped by service
- [x] `README.md` — overview, local setup, ASCII architecture diagram, link to PLAN.md
- [!] Verify `docker compose up` — BLOCKED: Docker not installed locally; verify when available

## Phase 1 — Auth [`feature/auth`]
- [x] Models: `users`, `user_goals` (SQLAlchemy, UUID PKs)
- [x] `core/security.py` — bcrypt hashing + JWT encode/decode (access+refresh)
- [x] `api/deps.py` — `get_current_user` Bearer dependency
- [x] `POST /auth/register` (+ `POST /auth/refresh`, `POST /auth/oauth` bridge)
- [x] `POST /auth/login`
- [x] `GET /auth/me`
- [x] `PUT /auth/goal` — set learning goal + target date
- [x] Alembic migration `0001_users` (+ alembic.ini, env.py, script.py.mako)
- [x] NextAuth config: credentials provider + Google OAuth, JWT session (backend JWT is canonical)
- [x] `app/(auth)/signup/page.tsx`
- [x] `app/(auth)/login/page.tsx`
- [x] `app/profile/page.tsx` — name/email/goal/target date + placeholder stats
- [x] `middleware.ts` — protect app routes
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend `py_compile` passes
- [!] Verify (deferred, needs Docker/Postgres): `alembic upgrade head`; register→login→`/auth/me`; Google round-trip; `/profile` redirect when unauthenticated

## Phase 2 — Knowledge Base [`feature/knowledge-base`]
- [x] Models: `collections`, `materials`, `material_chunks` (embedding `vector(1536)` + HNSW index)
- [x] Text extraction: PDF (pypdf), DOCX (python-docx), TXT/paste
- [x] Chunking service (~512 tokens, 50 overlap; tiktoken cl100k_base + char fallback)
- [x] `llm/embeddings.py` + `services/embeddings.py` — batch embed (text-embedding-3-small; opt-in dev fallback via `DEV_FAKE_EMBEDDINGS`)
- [x] `services/storage.py` — S3/Supabase raw file upload (required; storage_key NOT NULL)
- [x] `POST /materials/upload` (multipart)
- [x] `POST /materials/paste`
- [x] `GET /materials`, `GET /materials/{id}`, `DELETE /materials/{id}`
- [x] Collection CRUD endpoints (`app/api/collections.py`)
- [x] Alembic migration `0002_materials`
- [x] Frontend `/library`: upload zone (drag/drop + paste), collection manager, material list + status
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend `py_compile` passes
- [!] Verify (deferred, needs Docker/Postgres+pgvector/S3): `alembic upgrade head`; upload PDF → chunks with non-null embeddings, user-scoped; paste path; delete removes chunks + S3 object; cross-user isolation

## Phase 3 — AI Companion [`feature/ai-companion`]
- [x] Models: `chat_sessions`, `chat_messages` (citations JSON)
- [x] `services/rag.py` — embed query + top-k cosine search (user-scoped)
- [x] `llm/anthropic_client.py` — Claude wrapper (model from env, returns usage)
- [x] `services/companion.py` — Socratic trilingual system prompt + citation + outside-knowledge flag
- [x] `POST /chat/message`, `GET /chat/history/{session_id}`, `GET /chat/sessions`
- [x] Alembic migration `0003_chat`
- [x] Frontend `/chat`: chat window, message bubbles, source-citation chips
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend `py_compile` passes
- [!] Verify (deferred, needs Docker/Postgres+pgvector/ANTHROPIC_API_KEY): grounded answer w/ citation; honest "not in materials"; language match

## Phase 4 — Quiz Mode [`feature/quiz-mode`]
- [x] Models: `quiz_sessions`, `quiz_questions`, `quiz_answers`
- [x] `services/quiz.py` — generation (MC/short) tagged with concept + source_material_id
- [x] Difficulty modes: gentle / solid / expert
- [x] Grading: MC exact-match; short via Claude w/ rationale + explanation
- [x] `POST /quiz/generate`, `POST /quiz/answer`, `GET /quiz/results/{session_id}` (+ `GET /quiz/sessions`, `GET /quiz/stats`)
- [x] Alembic migration `0004_quiz`
- [x] Frontend `/quiz`: collection selector, difficulty picker, question display, feedback, results
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend `py_compile` passes
- [!] Verify (deferred, needs Docker/Postgres+pgvector): grounded questions; correct/incorrect + explanation; score saved

## Phase 5 — Gap Detection [`feature/gap-detection`]
- [x] `services/gaps.py` — concept wrong ≥2× across ≥2 sessions = gap; strong = ≥2 answers & ≥80% accuracy
- [x] Map gaps → suggested source sections (gap concept → `source_material_id` → material title)
- [x] `GET /gaps` → `{ strong, gaps, suggested_sections }` (scoped to current user via JWT, not a path `user_id`)
- [x] Recompute after each quiz / on page load (report computed live on every request; no stored snapshot)
- [x] Frontend `/gaps`: strong-vs-weak breakdown with material links; Gaps nav link added across pages
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend `py_compile` passes
- [!] Verify (deferred, needs Docker/Postgres): repeated wrong concept surfaces as gap; report updates with new sessions

## Phase 6 — Learning Plan [`feature/learning-plan`]
- [x] Model: `learning_plans` (plan_json, stale flag, goal snapshot; one row per user)
- [x] Agent tools: `get_knowledge_gaps`, `list_topics`, `get_days_until_goal`, `generate_plan`
- [x] `services/plan_agent.py` — LangChain tool-calling agent composing tools → day-by-day plan
- [x] `POST /plan/generate`, `GET /plan` (scoped to current user via JWT, not a path `user_id`)
- [x] Regenerate on: new upload / quiz completion / goal date change (stale flag flipped; on-demand regenerate via UI nudge)
- [x] Alembic migration `0005_plan`
- [x] Frontend `/plan`: timeline view mapping materials to days + stale banner
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend `py_compile` passes
- [!] Verify (deferred, needs Docker/Postgres+ANTHROPIC_API_KEY): plan references real materials + current gaps; updates after new quiz/upload

## Phase 7 — Telegram Bot [`feature/telegram-bot`]
- [x] Backend: link-token endpoint, `telegram_links` model, quiz-for-bot, reminder settings (`/telegram/*`, shared-secret + JWT; reuses quiz_service)
- [x] Alembic migration `0006_telegram`
- [x] Bot `/start` (link via token)
- [x] Bot `/quiz` (inline 5-question MC session → records to account via streak hook)
- [x] Bot `/reminder HH:MM` (+ `/reminder off`)
- [x] Bot `/streak`, `/status`
- [x] APScheduler (PTB job_queue) 60s tick: daily reminders + streak increment + milestone celebration
- [x] Frontend: profile "Connect Telegram" section (deep link + linked status/streak)
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend + bot `py_compile` pass
- [!] Verify (deferred, needs TELEGRAM_BOT_TOKEN + Docker/Postgres): link works; inline quiz records; reminder scheduled; streak increments

## Phase 8 — Payments [`feature/payments`]
- [x] Models: `subscriptions`, `payment_events` (+ `payme_transactions` for the Payme state machine)
- [x] `POST /payments/stripe/checkout`
- [x] `POST /payments/stripe/webhook` (signature verify → activate; idempotent on event id)
- [x] `POST /payments/payme/webhook` (JSON-RPC: CheckPerform/Create/Perform/Cancel/CheckTransaction + Basic-auth + error codes)
- [x] `services/limits.py` — free: 3 quizzes/day + 5 uploads; premium: unlimited (enforced as HTTP 402 in quiz/upload/bot-quiz)
- [x] Alembic migration `0007_payments`
- [x] Frontend `/pricing` + `/billing` (upgrade/cancel/history + usage meters; Billing nav link; 402 upgrade affordance)
- [x] Verify (partial): frontend `npm run build` + `tsc --noEmit` pass; backend `py_compile` passes
- [!] Verify (deferred): Stripe test-mode webhook flips premium (needs keys + Postgres + Stripe CLI); Payme protocol-level only (no sandbox)

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
