# Ilm AI — Final Sprint Summary

Companion to `final-task.md` (the spec) and `PERF_AUDIT.md` / `DESIGN_SYSTEM.md`
(the detailed artifacts). This file is the demo script: what shipped, which
branches/PRs landed it, and the exact steps to demo each completed feature. It
feeds the Loom walkthrough and the diary entries.

> **Status:** P0–P3 complete; P4 partially done (S3 Flashcards shipped, S2
> Multimodal deliberately left). Deployment (15%) is deferred to the Docker
> session. Some live checks are deferred where the machine lacks credentials
> (Supabase auth, Telegram token, Stripe sandbox) — flagged per feature below.

---

## Branches merged this sprint

| Priority | Branch | PR | What landed |
|---|---|---|---|
| P0 Performance | `perf/speed-audit-and-fixes` | #20 | Groq LLM swap, DB pool warmup, background ingest, streaming chat, N+1 fixes, created_at indexes |
| P1 UI Redesign | (UI: `feature/ui-overhaul` #14–#18) · closure `chore/p1-ui-closure` | #21 | teal+sand design system, `components/ui/` + AppShell, 6 Tier-1 screens + Tier-2, a11y + i18n; closure added root `DESIGN_SYSTEM.md` |
| P2 Telegram | `feat/telegram-functionality` | #22 | Web-side reminder time picker + JWT `PUT /telegram/reminder` (bot link/quiz/streak/reminder already built in Phase 7) |
| P3 Rubric gaps | `chore/rubric-gap-closure` | #23 | Groq-safe plan agent, dead-code removal, `llm_logs` prompt/response text, 50-sample eval set |
| P4 S3 Flashcards | `feat/flashcards` | #24 | `/flashcards` Telegram command generating cards from materials |
| Diary | `chore/diary-2026-06-11` | #25 | Session diary entry |

---

## P0 — Performance

**What:** The app felt slow; audited and fixed the hot paths. Primary LLM swapped
to **Groq `llama-3.3-70b-versatile`** (Anthropic credits exhausted; kept as
auto-fallback). DB pool warmup at startup, dropped per-request `pool_pre_ping`,
non-blocking LLM logging, background document ingest, SSE streaming chat, and a
batched quiz-results query. Before/after numbers are in `PERF_AUDIT.md`.

**Acceptance (warm):** login 1.54s, register 1.82s, chat first token ~2.0s
(stream), upload returns in 1.97s as `processing` then `ready` ~4s in background.

**Demo:**
1. `cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app` (warm it with one request first).
2. Time login: `curl -w "%{time_total}\n" -X POST localhost:8000/auth/login -H "Content-Type: application/json" -d '{"email":"...","password":"..."}'`.
3. Upload a file in the UI → note it returns immediately as **Processing**, then flips to **Ready** without a page block.
4. Send a chat message → first tokens stream in within ~2s.

> Deferred: applying Alembic `0010` (created_at indexes) to Supabase needs DB authorization.

---

## P1 — UI Redesign

**What:** A calm, warm **teal + sand** design system (not generic-AI neon).
Tokens live in `frontend/tailwind.config.ts` + `app/globals.css`; components
consume tokens, never hardcoded hex. Full `components/ui/` primitive library +
`AppShell`. All six Tier-1 screens (landing, auth, library, chat, quiz, plan)
and Tier-2 pages (profile, billing, pricing, gaps) have loading/empty/error
states, accessibility (focus rings, reduced-motion, zoom), and i18n (en/ru/uz).
Canonical tokens documented in root `DESIGN_SYSTEM.md`.

**Demo:**
1. `cd frontend && npm run build && npm start` (production build is the gate).
2. Walk landing → sign up → upload → chat → quiz → plan.
3. Resize to ~375px (mobile) — layout holds, nav collapses.
4. Toggle language en/ru/uz; trigger an empty state (new account) and an error state (stop the backend).

---

## P2 — Telegram Bot

**What:** Bot is fully functional. Account linking via deep-link token, `/quiz`
(saved to the shared `quiz_*` tables), consecutive-day **streak** + milestone
messages, and **daily reminders** delivered by the bot `job_queue` polling
`GET /telegram/reminders/due` (no Celery/Redis). This sprint added the ability to
set the reminder time **in web settings** (JWT `PUT /telegram/reminder` + profile
time picker).

**Demo:**
1. Web → Profile → **Connect Telegram** → open the deep link → bot replies "Linked".
2. Set a reminder time on the profile page → confirm it persists.
3. In Telegram: `/quiz` → answer the inline questions → see score + streak message.

> Deferred: a full live round-trip needs `TELEGRAM_BOT_TOKEN` + Postgres (unavailable locally).

---

## P3 — Rubric Gap Closure

**What:** Most rubric items were already satisfied; three real gaps closed:
- **Agent Behaviour** — the learning-plan agent hard-required Anthropic and broke
  under the Groq swap; `services/plan_agent.py` now runs the gaps→topics→days→plan
  sequence through the `anthropic_client` chokepoint (Groq primary, Anthropic
  fallback) and the dead langchain code was removed.
- **Eval & Monitoring** — `llm_logs` now stores truncated prompt/response text
  alongside tokens/latency/model (Alembic `0011`); eval set grown 6 → **50 rated
  samples** (`docs/eval/samples.jsonl`, en/ru/uz), `run_eval.py` supports Groq live + `--out`.
- **RAG Quality / Code Quality** — verified, not changed: inline `[Source, #chunk]`
  citations, `[Outside knowledge]` flag, reply-in-learner's-language; env-driven
  config with a production secrets guard, no bare excepts.

**Demo:**
1. Ask the companion something answerable from materials → answer carries `[Source title, #chunk]`.
2. Ask something outside the materials → response is flagged `[Outside knowledge]` / "not in your materials".
3. Ask in Russian/Uzbek → reply comes back in that language.
4. `cd backend && .venv/Scripts/python.exe docs/eval/run_eval.py --dry-run` → loads 50 samples.

> Deferred: apply Alembic `0011` to Supabase; live plan generation against Groq+DB; Stripe test-mode webhook (no sandbox keys locally).

---

## P4 — Stretch

### S3 Flashcards (shipped)

**What:** A `/flashcards` Telegram command generates 8 flashcards from the user's
uploaded materials and sends them one card per message. Reuses the quiz pipeline:
RAG-retrieve chunks → LLM JSON array (`kind="flashcard_generate"`, logged via the
existing monitoring path) → `{front, back, concept}`. Telegram-only and ephemeral
— no DB table, no migration, no web UI (confirmed minimal scope). New
`backend/app/services/flashcard.py`, shared-secret `POST /telegram/flashcards/generate`,
bot client + handler, and parser unit tests.

**Demo:**
1. Link a Telegram chat (P2) and ensure the account has uploaded materials.
2. Send `/flashcards` → bot replies with N cards, each `❓ front / 💡 back`.

> Verified offline: `ruff` clean, `pytest` green, endpoint registered, imports clean.
> The live `/flashcards` run is the recordable acceptance flow.
> Follow-up: `/flashcards` has no per-tier daily limit yet — free-tier LLM cost is unbounded for that command.

### S2 Multimodal upload (not started)

Deliberately out of scope this session.

---

## Follow-ups for the Docker / deployment session

- Apply Alembic `0010` and `0011` to Supabase (needs DB authorization).
- Live Telegram round-trip with `TELEGRAM_BOT_TOKEN` + Postgres.
- Stripe test-mode webhook round-trip with sandbox keys + Stripe CLI.
- Live plan generation against Groq + DB.
- Add a per-tier daily limit to `/flashcards` if its LLM cost matters.
- Deployment (15%) itself: Render blueprint / prod compose walkthrough.
