# Senior Review — Ilm AI

_Phase 0 findings: an honest, file-grounded inventory before any changes. Written while
taking over the codebase as a senior engineer. No application code was changed to produce
this document._

> **TL;DR** — The product is genuinely feature-complete and the backend is well-built.
> The logic works; the **UI is the weak link**. The single biggest "junior" tell is the
> absence of a design system and a shared app shell: every page hand-rolls its own header,
> button, and card styling from raw Tailwind defaults. Fixing that one thing (Phase 2) is
> the highest-leverage move. The landing page (Phase 1) is the next priority. A handful of
> real bugs and hardening gaps are listed below.

---

## 1. Stack map

| Layer | Tech | Notes |
|---|---|---|
| Frontend | Next.js **14.2.18** (App Router, TS), Tailwind 3.4, NextAuth 4 | `frontend/` |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic settings | `backend/app/` (layered: `api/`, `services/`, `models/`, `llm/`, `core/`) |
| DB | PostgreSQL + **pgvector** (384-dim) | Migrations `0001`–`0008` |
| LLM | Anthropic Claude via a single chokepoint `complete()` | `backend/app/llm/anthropic_client.py` |
| Embeddings | Local `sentence-transformers` (all-MiniLM-L6-v2), or `DEV_FAKE_EMBEDDINGS` | `backend/app/llm/embeddings.py` |
| Monitoring | Sentry (FE + BE), `llm_logs` table | gated on DSN env |
| Bot / Payments | python-telegram-bot; Stripe + Payme | `bot/`, `backend/app/services/{stripe,payme}_service.py` |

**How the pieces talk:** the Next.js app authenticates via NextAuth, stores a JWT in the
session, and calls the FastAPI backend through one thin client, `frontend/lib/api.ts`
(`apiFetch`). The backend authenticates every request with `get_current_user`
(`backend/app/api/deps.py`) and scopes all queries by `user_id`.

---

## 2. How to run locally (verified 2026-06-06)

**What was verified this session**
- `npm run lint` (frontend) → **clean**.
- `pytest` (backend, `DEV_FAKE_EMBEDDINGS=1`) → **5/5 pass**, including the `/health` smoke
  test, so the backend imports and boots.

**Environment present on this machine:** Node v24, Python 3.13 + `backend/.venv`,
`frontend/node_modules` installed. **No Docker, no local Postgres.**

**⚠️ Blocker for a full click-through:** the only configured database is the **paused
Supabase** project (`.env` `DATABASE_URL` → `...pooler.supabase.com`), and there is no
local Postgres/pgvector available. So the end-to-end journey (sign up → upload → chat →
quiz → gaps → plan → payment) **could not be exercised live locally** this session. The
findings on app surfaces below are therefore grounded in a close read of the actual page
code, not a live walk-through. To unblock a real E2E pass, do **one** of:
1. **Resume the Supabase project** (free tier auto-pauses), or
2. Install Docker and run `pgvector/pgvector:pg16`, point `DATABASE_URL` at it, set
   `DEV_FAKE_EMBEDDINGS=true`, `alembic upgrade head`, then `uvicorn app.main:app --reload`
   + `npm run dev`.

**Run commands (once a DB is reachable):**
```bash
# backend
cd backend && .venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload          # http://localhost:8000  (/health, /docs)
# frontend
cd frontend && npm run dev             # http://localhost:3000
```

---

## 3. What works (don't touch without reason)

- **Backend architecture** is clean and layered; per-user data isolation is enforced
  consistently (`user_id` filter on every query reviewed). This is solid senior-level work.
- **Single LLM chokepoint** + `llm_logs` monitoring — good instrumentation.
- **Quiz flow** (`frontend/app/quiz/page.tsx`) is the most polished surface: difficulty
  cards, progress bar, color-coded feedback, expandable results. Use it as the quality bar.
- **RAG with citations**, gaps detection, and the tool-calling plan agent are all wired and
  reasonable.
- CI is green; deployment artifacts (render.yaml, prod compose, docs) exist.

---

## 4. What's visually weak (per surface)

**App-wide (root causes — fixing these fixes most pages at once):**
- **No design system.** `frontend/tailwind.config.ts` defines only two tokens
  (`brand`, `brand-fg`). Everything else is raw Tailwind `slate-*`. No tokens for
  spacing, typography, radius, shadow, or semantic color roles.
- **No reusable primitives.** The button pattern
  `rounded-xl bg-brand … text-brand-fg disabled:opacity-60` is copy-pasted across ~10+
  files; the card pattern `rounded-xl border border-slate-200 p-5` likewise. No
  `Button`, `Input`, `Card`, `Modal`, `Toast`, `Skeleton`, or `EmptyState` components.
- **No shared app shell / navigation.** Every page hand-rolls its own `<header>` with a
  *different subset* of plain-text links in a *different order* (compare `quiz`, `library`,
  `profile`, `chat`, `plan`, `gaps`). No logo, no active state, no mobile nav. This is the
  biggest single "junior" signal and a real wayfinding problem on phones.
- **No loading skeletons** — every page renders the literal text `Loading…`
  (`p-6 text-slate-500`).
- **No toasts / modals** — dialogs use `window.confirm` / `window.prompt`
  (`components/material-list.tsx:28`, `components/collection-manager.tsx:37,53`); status is
  inline `msg` strings.
- **No i18n** — the brief calls for Uzbek/Russian/English; the UI is 100% hardcoded English
  and `<html lang="en">` is fixed (`frontend/app/layout.tsx:23`).
- **Emoji used as UI icons** (📄 ○ 🔥 🏆 ⏰ ✓) in plan/profile — fine as a stopgap, junior
  look; swap for a consistent icon set.

**Landing — `frontend/app/page.tsx` (Phase 1 priority):**
- Copy is decent but it **leads with features, not the problem**, has **no personas**, **no
  "how it works"**, **no trust signals**, and no imagery/motion. Single hero + four generic
  bordered cards + a quote footer. Cramped `max-w-md … sm:max-w-3xl`. The brief wants a
  problem-first, persona-driven, trust-building page.

**Auth — `frontend/components/auth-form.tsx`:** functional; no branding/logo, no password
visibility toggle.

**Library / upload — `frontend/app/library/page.tsx`, `components/upload-zone.tsx`,
`material-list.tsx`, `collection-manager.tsx`:** upload is synchronous with a single
"Uploading…" label — **no real per-file progress/embedding indicator**; destructive actions
use native `confirm/prompt`; weak empty states.

**Chat — `frontend/app/chat/page.tsx`, `components/chat-window.tsx`,
`message-bubble.tsx`, `source-citation.tsx`:** fixed `h-[70vh]` window; plain
"Ilm is thinking…"; **no streaming**; assistant text is `whitespace-pre-wrap` only (**no
markdown rendering**); citations are tiny pills.

**Gaps — `frontend/app/gaps/page.tsx`:** actually good (color-coded, real empty state).
Mostly needs token/typography polish.

**Plan — `frontend/app/plan/page.tsx`:** nice timeline + stale-banner UX; emoji icons.

**Profile — `frontend/app/profile/page.tsx`:** stat cards OK; emoji-heavy Telegram block.

**Pricing / billing — `frontend/app/pricing/page.tsx`, `app/billing/page.tsx`:** usage
meters are good; otherwise generic; trust framing is thin.

**Error page — `frontend/app/global-error.tsx`:** unstyled **inline styles**, unbranded,
not responsive.

---

## 5. What's buggy / risky (with file paths)

| # | Severity | Where | Issue |
|---|---|---|---|
| B1 | A11y | `frontend/app/layout.tsx:11-15` | `viewport.maximumScale: 1` disables pinch-zoom — fails mobile accessibility. |
| B2 | Visual | `frontend/app/globals.css:5-7` | `color-scheme: light dark` with **no dark styles** → native inputs/date pickers/scrollbars render dark-on-light surfaces for dark-OS users. Likely unintended. |
| B3 | Correctness | `frontend/app/quiz/page.tsx:389-391` | MC answer identity is `opt[0]` (first character of the option string). Assumes every option is prefixed `A) …` with unique leading chars. Fragile if the backend ever returns un-prefixed/duplicate-prefixed options → wrong/blocked selection. |
| B4 | UX | `frontend/lib/api.ts` | `apiFetch` has **no timeout/abort and no retry**. Long RAG/quiz/plan calls can hang with only a disabled button as feedback. |
| B5 | UX | `frontend/app/chat/*` | Assistant markdown is shown raw (no renderer); long answers look unformatted. |
| B6 | Security | `.env` (local, gitignored ✓) | Real `ANTHROPIC_API_KEY` lives in `.env`; it was surfaced into a chat session this cycle — **rotate it**. `.env` itself is correctly untracked. |
| B7 | Security | `backend/app/core/config.py` | `JWT_SECRET` default `"change-me-in-env"`; ensure it is set in every deployed env (Render secret group covers this — verify). |
| B8 | Hardening | `backend/app/api/quiz.py`, `plan.py`; `services/stripe_service.py` | Broad `except Exception` returning 500 with raw messages; Stripe webhook echoes raw exception text (info leak). Return generic messages, log details. |
| B9 | Hardening | `backend/app/api/auth.py` | No rate-limit/throttle on `/auth/login` → brute-forceable. |
| B10 | Supply chain | `frontend` deps | `npm audit`: **11 vulns (1 critical, 5 high, 4 moderate, 1 low)**. Critical is Next.js 14.2.18. Real fixes need breaking majors (Next 16, Sentry 8) → schedule deliberately, verify build, don't `--force` blindly. |

_None of the above block the current happy path; they are the senior cleanup list._

---

## 6. Quick wins vs bigger jobs

| Effort | Item |
|---|---|
| **Quick win** | B1 (re-enable zoom), B2 (drop stray `color-scheme` or add proper theming), style `global-error.tsx`, extract a `Button` + `Card` primitive, add a real `Loading`/`Skeleton` + `EmptyState`. |
| **Quick win** | Replace `window.confirm/prompt` with a `Modal`/confirm dialog; add a `Toast`. |
| **Medium** | Shared **app shell** (logo + consistent nav + mobile bottom-bar + active state). Landing page rebuild (Phase 1). Markdown rendering in chat (B5). `apiFetch` timeout/abort (B4). |
| **Medium** | Backend hardening B8/B9 (error hygiene + login throttle). |
| **Bigger job** | Full design-system rollout across every surface (Phase 2). i18n (UZ/RU/EN) scaffolding + extraction. Dependency major-upgrade for B10 with full regression. |

---

## 7. Design system (foundation for Phase 2)

The full token spec lives in **[`docs/design-system.md`](docs/design-system.md)**. Summary:

- **Palette — "warm library, patient tutor" (deep teal + warm sand):** keeps the existing
  brand teal as the anchor so nothing visually breaks, and pairs it with warm cream/sand
  neutrals and an amber micro-accent instead of cold slate-on-white.
  - Anchor `#0E7490` · Accent `#D97706` · Ink `#1C2A33` · Cream surface `#FBF8F2` · Sand `#ECE5D8`
  - **Why:** _Ilm_ means knowledge; the brief asks for calm/trustworthy/warm and explicitly
    bans the purple-gradient AI look. Warm neutrals read as paper/library rather than a
    cold SaaS dashboard, and reusing the teal anchor keeps the change low-risk.
- **Components to build (replacing today's one-off styles):** `Button` (variants/sizes/
  loading), `Input`/`Textarea`/`Select`, `Card`, `Modal` (replaces `window.confirm/prompt`),
  `Toast`, `Skeleton`, `EmptyState`, and an `AppShell` with consistent nav.
- Tokens map to a proposed `tailwind.config.ts` extension — **specified only, not yet
  applied** (see the design-system doc).

---

## 8. Proposed phased approach (each gated on your approval)

Per the one-phase-at-a-time cadence, after this Phase 0:

1. **Phase 1 — Landing page.** Problem-first, persona-driven, trust signals, one CTA,
   "how it works", tasteful motion. Built on the new tokens. _Done when it reads as
   genuinely beautiful at 375px and desktop._
2. **Phase 2 — App-wide design system.** Tokens + primitives + shared `AppShell`; roll out
   across every surface; design every state (loading/empty/error/success); a11y basics;
   i18n scaffolding. _The biggest junior→senior lever._
3. **Phase 3 — Bug hunt & hardening.** Fix the table in §5 and anything found while
   touching screens; lightweight tests for flows changed.
4. **Phase 4 — Verify end-to-end.** Full journey on mobile + desktop, no console/server
   errors, tests green, then the dependency upgrades (B10) with regression.

> Recommended next step: **approve a real E2E unblock** (resume Supabase _or_ local Docker
> pgvector) so Phase 1+ can be verified live, then start Phase 1.
