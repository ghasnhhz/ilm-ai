# Smoke Test — end-to-end checklist

Run after every deploy to confirm the core flows work. Replace `API` with the backend
base URL (e.g. `https://ilm-backend.onrender.com`) and `APP` with the frontend URL.
Tick each box; if any fail, check the service logs and Sentry.

## 0. Health
- [ ] `GET API/health` → `200 {"status":"ok", ...}`
- [ ] `GET API/docs` loads the Swagger UI
- [ ] `APP/` landing page renders (mobile width, 375px)

## 1. Auth
- [ ] Sign up at `APP/signup` with a new email → redirected into the app
- [ ] Log out, log back in at `APP/login`
- [ ] Google sign-in round-trips (if Google OAuth configured)
- [ ] Visiting a protected route while logged out redirects to login
- [ ] Set a learning goal + target date on `APP/profile`

## 2. Knowledge base
- [ ] Upload a PDF/DOCX/TXT on `APP/library` → material appears, status reaches **ready**
- [ ] Paste text as a material → ready
- [ ] Delete a material → removed from the list

## 3. AI companion (grounded chat)
- [ ] Ask a question answerable from the uploaded material → answer cites a source chip
- [ ] Ask something **not** in the materials → companion says so honestly (no fabrication)
- [ ] Ask in Russian or Uzbek → reply comes back in the same language

## 4. Quiz
- [ ] Generate a quiz (pick a difficulty) → questions appear, grounded in the material
- [ ] Answer MC + short-answer questions → correct/incorrect feedback + explanation
- [ ] Results page shows the score

## 5. Gaps & plan
- [ ] After ≥2 quizzes, `APP/gaps` shows weak vs. strong concepts with material links
- [ ] `APP/plan` generates a day-by-day plan referencing real materials
- [ ] Stale banner appears after a new upload/quiz; regenerate refreshes it

## 6. Telegram bot
- [ ] "Connect Telegram" on `APP/profile` → deep link opens the bot, `/start` links the account
- [ ] `/quiz` runs an inline 5-question session and records to the account
- [ ] `/reminder HH:MM` schedules; `/streak` and `/status` report correctly

## 7. Payments (test mode)
- [ ] Hit a free-tier limit (e.g. 4th quiz in a day) → HTTP 402 upgrade affordance
- [ ] Stripe checkout (test card) → webhook flips the account to **premium**, limits lift
- [ ] `APP/billing` shows status + usage; cancel works

## 8. Monitoring
- [ ] After the steps above, `GET API/admin/metrics` (as an `ADMIN_EMAILS` user) returns
      non-zero DAU / quiz completions / uploads / total tokens
- [ ] A non-admin user gets `403` from `/admin/metrics`
- [ ] If `SENTRY_DSN` is set, a forced error shows up in Sentry

## 9. Migrations
- [ ] `alembic upgrade head` is at the latest revision (`0008_monitoring`)
- [ ] `llm_logs` and all phase tables exist; pgvector extension present
