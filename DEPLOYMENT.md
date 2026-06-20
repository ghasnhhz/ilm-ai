# Deploying Ilm AI

Three supported paths: **Render** (recommended, blueprint-driven), **Railway**, and a
**self-hosted VPS** with Docker Compose. All three use the same Dockerfiles
(`backend/`, `frontend/`, `bot/`).

> Migrations run with `alembic upgrade head`. Migration `0002_materials` does
> `CREATE EXTENSION IF NOT EXISTS vector`, so pgvector is provisioned automatically as
> long as the database role may create extensions (Render and standard Postgres allow
> this; on locked-down managed Postgres, create the extension once by hand first).

---

## Option A — Render (recommended)

Render reads [`render.yaml`](./render.yaml) and provisions two web services:
`ilm-backend` and `ilm-frontend`. The database is an **existing Supabase Postgres**
(not Render-managed) — set `DATABASE_URL` in the dashboard for `ilm-backend` to the
Supabase pooler connection string (`postgresql+psycopg2://…pooler.supabase.com:6543/postgres`).

> The **Telegram bot is not in this blueprint**: Render's free tier has no background
> workers. Host it on an always-on platform with a free worker (e.g. Koyeb) or run it
> locally, built from `./bot/Dockerfile`. It needs `TELEGRAM_BOT_TOKEN`,
> `TELEGRAM_BOT_SECRET`, `DATABASE_URL` (Supabase), and `BACKEND_INTERNAL_URL` → the
> deployed backend URL.

### 1. Create the blueprint
1. Push this repo to GitHub (already done for `main`).
2. In Render: **New +** → **Blueprint** → connect the repo → **Apply**.
3. Render creates `ilm-backend`, `ilm-frontend` and the `ilm-secrets` env group.
   (No database — this app uses Supabase; the bot is hosted separately, see above.)

### 2. Set secrets
Every value declared `sync: false` in `render.yaml` must be set in the dashboard:
- **Env group `ilm-secrets`** (backend): `JWT_SECRET`, `AUTH_BRIDGE_SECRET`,
  `TELEGRAM_BOT_SECRET`, `TELEGRAM_BOT_USERNAME`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `S3_*`, `SUPABASE_URL`, `STRIPE_*`, `PAYME_*`, `SENTRY_DSN`, `ADMIN_EMAILS`.
  (`ANTHROPIC_MODEL` defaults to `claude-sonnet-4-6`. The primary LLM is Groq — also add
  `GROQ_API_KEY` here.)
- **`ilm-backend`**: `DATABASE_URL` (Supabase pooler string), plus `CORS_ORIGINS` and
  `APP_BASE_URL` → the frontend's URL (e.g. `https://ilm-frontend.onrender.com`).
- **`ilm-frontend`**: `NEXT_PUBLIC_API_URL` → the backend's URL
  (e.g. `https://ilm-backend.onrender.com`), plus `NEXTAUTH_URL` (the frontend URL),
  `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_SENTRY_DSN`.
  `NEXT_PUBLIC_*` is baked at build time — set these **before** the first build, then
  trigger a redeploy.

### 3. Migrations
`ilm-backend` runs `alembic upgrade head` in its **start command** (in `render.yaml`)
before uvicorn, so the schema is applied on startup. Free-tier services don't support
pre-deploy commands; the command is idempotent, so cold-start restarts re-run it safely.
Supabase ships pgvector already enabled.

### 4. Continuous deploys
- Render's GitHub integration auto-deploys on push to `main`.
- For an explicit trigger, create a **Deploy Hook** (backend service → Settings → Deploy
  Hook) and add its URL as a GitHub repo secret named `RENDER_DEPLOY_HOOK_URL`. The
  [`deploy.yml`](./.github/workflows/deploy.yml) workflow pings it on push to `main`
  (and no-ops if the secret is absent).

> **Free tier caveats**: free web services sleep on inactivity, so the first request
> after idle pays a cold start. Use paid plans to avoid sleeping.

---

## Option B — Railway

Railway can deploy each service from its Dockerfile:
1. New project → **Deploy from GitHub repo**.
2. Add three services pointing at `backend/`, `frontend/`, `bot/` (set each service's
   root/Dockerfile path).
3. Add a **PostgreSQL** plugin; copy its connection string into `DATABASE_URL`
   (use the `postgresql+psycopg2://` scheme for the backend).
4. Set the same env vars as the Render lists above.
5. Run migrations once from the backend service shell: `alembic upgrade head`
   (or add it as a deploy/start command).

---

## Option C — Self-hosted VPS (Docker Compose)

Uses [`docker-compose.prod.yml`](./docker-compose.prod.yml) — baked images, restart
policies, and a one-shot `migrate` service that runs `alembic upgrade head` before the
backend starts.

```bash
git clone <repo> && cd ilm-ai
cp .env.example .env          # fill in real secrets
docker compose -f docker-compose.prod.yml up -d --build
```

- Frontend → `http://<host>:3000`, Backend → `http://<host>:8000` (`/health`, `/docs`).
- pgvector is enabled via `infra/db/init.sql` (mounted into the db container) **and** the
  `0002` migration, so either path provisions it.
- Put a reverse proxy (Caddy / Nginx) in front for TLS and to route `/` → frontend and
  your API host → backend. Set `CORS_ORIGINS`, `APP_BASE_URL`, `NEXT_PUBLIC_API_URL`,
  and `NEXTAUTH_URL` to the public URLs.
- Updates: `git pull && docker compose -f docker-compose.prod.yml up -d --build`
  (the `migrate` service re-runs migrations).

---

## CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push and PR:
- **backend** — `ruff check` + `pytest` (offline-safe smoke tests).
- **frontend** — `npm run lint` + `npm run build`.

## Post-deploy
Run the end-to-end checklist in [`docs/smoke-test.md`](./docs/smoke-test.md).
