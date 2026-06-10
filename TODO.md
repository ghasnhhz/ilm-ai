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
`perf/speed-audit-and-fixes` (Final Sprint — Priority 0)

---

# FINAL SPRINT (see `final-task.md`)

## Current State (verified at start of sprint)
- **Backend**: FastAPI, sync `def` handlers (FastAPI threadpools them — no async/asyncpg
  rewrite needed). SQLAlchemy + psycopg2 to **Supabase pooler, Sydney region** — every DB
  round-trip is ~1.3 s from this location, so round-trip *count* dominates latency.
- Embedding model (`all-MiniLM-L6-v2`, 384-dim, local) already loads once at startup
  (lifespan + `lru_cache`) — unchanged.
- LLM was Anthropic Claude via `llm/anthropic_client.complete()` (single chokepoint used by
  companion, quiz, plan). **Anthropic credits exhausted** → swapped primary provider to
  **Groq `llama-3.3-70b-versatile`** (OpenAI-compatible via httpx, no new deps; Anthropic
  kept as auto-fallback). Overrides CLAUDE.md "Anthropic as the LLM" per explicit user request.
- pgvector HNSW index present; LLM logging (`llm_logs`) present but was a blocking per-call DB write.

## Priority checklist
- [x] **P0 Performance** — audit + fixes (this branch). Acceptance: login/register < ~1.5s warm
      (login 1.54s ok, register 1.82s ~); chat first token < ~2s (stream ~2.0s ok); upload returns
      immediately (1.97s -> `processing`, background `ready` ~4s ok). Numbers in `PERF_AUDIT.md`.
      Pending: apply Alembic `0010` to Supabase (needs DB authorization).
- [ ] **P1 UI Redesign** (ui-ux-pro-max, `DESIGN_SYSTEM.md`, 6 Tier-1 screens) — not started.
- [ ] **P2 Telegram bot** functionality — not started.
- [ ] **P3 Rubric gap closure** — not started.
- [ ] **P4 Stretch** (flashcards, multimodal) — only if P0-P3 done.

### P0 fixes landed (detail in `PERF_AUDIT.md`)
- [x] DB pool warmup at startup (`db.warm_pool()` in lifespan)
- [x] Dropped `pool_pre_ping` + pool sizing + recycle=180 + GET retry on stale conn
- [x] Non-blocking `record_llm_call` (background thread pool)
- [x] Removed redundant `db.refresh()` in auth + `expire_on_commit=False`
- [x] Background document ingest (upload returns immediately; no DB conn held across embed)
- [x] Single reused LLM HTTP client; Groq provider + Anthropic fallback
- [x] `POST /chat/message/stream` SSE endpoint (existing `/chat/message` unchanged)
- [x] Quiz-results N+1 -> one batched query
- [x] Alembic `0010` created_at indexes (SQL validated offline; **apply to DB pending**)

---

## (historical, pre-sprint) Last Completed Task
Phase 10 — Deployment (backend smoke tests `backend/tests/` — health 200, config
list-parsing, `/admin/metrics` 403 without auth — + `backend/pyproject.toml` pinning
pytest `testpaths` and ruff scope; `.github/workflows/ci.yml` runs backend `ruff check`
+ `pytest` and frontend `lint` + `build` on push/PR; `render.yaml` Blueprint provisioning
pgvector Postgres + backend(web, preDeploy `alembic upgrade head`) + frontend(web) +
bot(worker) with an `ilm-secrets` env group, all secrets `sync: false`;
`.github/workflows/deploy.yml` pings `RENDER_DEPLOY_HOOK_URL` on push to main, no-ops if
unset; `docker-compose.prod.yml` for VPS — baked images, `restart: unless-stopped`,
one-shot `migrate` service runs migrations before backend serves; `DEPLOYMENT.md`
Render-primary (+ Railway + VPS) and `docs/smoke-test.md` end-to-end checklist. Verified
locally: `pytest` (5 passed) + `ruff check` clean + all YAML parses + frontend build
passes from Phase 9. Live Render deploy deferred — no account/secrets. **MVP complete:
all phases 0–10 done.**

## Previously Completed
Phase 9 — Monitoring & Evaluation (`llm_logs` model + Alembic `0008_monitoring`;
`llm/logging.py` `record_llm_call` writes one row per call from inside the llm/ layer
using a request-scoped contextvar (`core/context.py`) for endpoint+user_id — endpoint
seeded by an HTTP middleware in `main.py`, user_id by `get_current_user`; opens its own
short-lived `SessionLocal` and swallows all errors so logging never breaks a request.
Claude calls centralised through `anthropic_client.complete(...)` — `quiz.generate_quiz`,
`quiz.grade_answer`, and `plan_agent._generate_plan_json` now route through it (no more
ad-hoc `Anthropic()` clients); LangChain plan agent logged best-effort via an `on_llm_end`
callback; `embed_texts` logs count+latency (kind=`embedding`). Sentry: backend
`sentry_sdk.init` in `main.py` behind `SENTRY_DSN` (no-op when empty); frontend
`@sentry/nextjs` 8.47 with `instrumentation.ts` + `sentry.{client,server,edge}.config.ts`
+ `app/global-error.tsx`, `next.config.js` wrapped in `withSentryConfig` (lazy require so
builds work pre-install), all gated on `NEXT_PUBLIC_SENTRY_DSN`. `GET /admin/metrics`
(DAU, quiz completions, uploads, total tokens + tokens-by-model/calls-by-kind), gated by
`get_admin_user` against the `ADMIN_EMAILS` allow-list; day boundary in Asia/Tashkent
(added `tzdata`). `docs/eval/`: rubric (4 dims, 1–5) + 6-sample `samples.jsonl` (en/ru/uz,
grounded + honesty cases) + `run_eval.py` (live/dry-run) + README. Frontend `npm install` +
`tsc --noEmit` + `npm run build` pass; backend `py_compile` + `import app.main` pass;
eval dry-run runs. DB-dependent checks (alembic upgrade, row written per call,
`/admin/metrics` counts, 403 for non-admin) deferred — no Postgres locally (Supabase
project paused).

Phase 8 — Payments & Premium tier (`Subscription`/`PaymentEvent`/`PaymeTransaction` models + Alembic `0007_payments`; `services/limits.py` is_premium/get_usage/check_quiz_limit/check_upload_limit/activate_premium/deactivate — free caps 3 quizzes/day + 5 uploads, enforced as HTTP 402 in quiz generate, materials upload/paste, and bot quiz; `services/stripe_service.py` Checkout + signature-verified webhook idempotent on event id; `services/payme_service.py` full JSON-RPC merchant protocol CheckPerform/Create/Perform/Cancel/CheckTransaction with Payme error codes + Basic-auth; `api/payments.py` checkout/webhooks/usage/cancel/history; config + `.env.example` STRIPE_PRICE_ID/PREMIUM_AMOUNT_UZS/PREMIUM_PRICE_LABEL/APP_BASE_URL; frontend `/pricing` + `/billing` pages, Billing nav link, 402 upgrade affordance on quiz). Frontend `npm run build` + `tsc` pass; backend `py_compile` passes; Stripe e2e (test mode) + Payme (protocol only) deferred — no keys/Postgres locally.

## Next Task
None — MVP complete (Phases 0–10). Remaining follow-ups: expand eval set to ≥50 samples;
run live Render deploy + smoke test once an account/secrets exist; `npm audit` cleanup.

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
- [x] Model: `llm_logs` (user_id, kind, model, input/output/total tokens, latency_ms, endpoint) + Alembic `0008_monitoring`
- [x] `llm/logging.py` — `record_llm_call` wraps all Claude + embedding calls via request-scoped contextvar; Claude calls centralised through `anthropic_client.complete`
- [x] Sentry init (backend `sentry_sdk.init` + frontend `@sentry/nextjs`) behind `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- [x] `GET /admin/metrics` — DAU, quiz completions, uploads, total tokens (+ by-model/by-kind); `ADMIN_EMAILS` allow-list
- [~] `docs/eval/` — rubric + runner + **starter 6 samples** (en/ru/uz, grounded + honesty); full ≥50 set is follow-up
- [x] Verify (partial): frontend `npm install`+`tsc`+`build` pass; backend `py_compile`+`import` pass; eval dry-run runs
- [!] Verify (deferred, needs Docker/Postgres): `alembic upgrade head`; each Claude/embedding call writes an `llm_logs` row; `/admin/metrics` returns real counts; non-admin → 403

## Phase 10 — Deployment [`chore/deployment`]
- [x] `docker-compose.prod.yml` — baked images, restart policies, one-shot `migrate` (alembic upgrade head) before backend serves
- [x] `.github/workflows/ci.yml` — backend `ruff check` + `pytest`, frontend `npm run lint` + `build`; backend smoke tests in `backend/tests/` + `pyproject.toml` (pytest testpaths/ruff scope)
- [x] `.github/workflows/deploy.yml` — pings `RENDER_DEPLOY_HOOK_URL` on push to main (no-op if unset); + `render.yaml` Blueprint (pgvector db + backend/frontend/bot, preDeploy migrations, `ilm-secrets` group)
- [x] `DEPLOYMENT.md` — Render-primary (+ Railway + VPS) guide + migrations/pgvector notes
- [x] `docs/smoke-test.md` — end-to-end checklist
- [x] Verify (partial): `pytest` (5 passed) + `ruff check` clean + all YAML parses locally; frontend build passes
- [!] Verify (deferred, needs Render account/secrets): CI green on push (will run on push); live deploy triggers on merge; smoke test passes against a deployed env

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
| SENTRY_DSN | Backend error tracking | Backend |
| SENTRY_TRACES_SAMPLE_RATE | Sentry perf trace sampling (0.0–1.0) | Backend |
| NEXT_PUBLIC_SENTRY_DSN | Browser-side error tracking | Frontend |
| ADMIN_EMAILS | Comma-separated emails allowed on /admin/metrics | Backend |
