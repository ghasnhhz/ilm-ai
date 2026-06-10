# PERF_AUDIT.md — Ilm AI Priority 0 Performance Audit

Branch: `perf/speed-audit-and-fixes`. Probe: `backend/scripts/perf_probe.py`
(black-box httpx timings against a live uvicorn bound to the **real Supabase
`.env`**, so every number includes real network round-trips). DB region:
`aws-1-ap-southeast-2` (Sydney) via the Supabase connection **pooler**; the dev
machine is far from that region, so per-round-trip latency is large and
**round-trip count dominates everything**.

Measurement date: 2026-06-11. Embedding model: `all-MiniLM-L6-v2` (local, 384-dim) — unchanged.

---

## BEFORE — end-to-end (probe, n=5 warm)

| Endpoint | Result | Target | Status |
|---|---|---|---|
| `/auth/register` (cold, first request) | **6033 ms** | < ~1500 ms | ❌ |
| `/auth/login` (warm, median) | **1739 ms** (p95 1898) | < ~1500 ms | ❌ |
| `/materials/upload` (sync ingest) | **54 895 ms** + intermittent 500 | return immediately | ❌❌ |
| `/chat/message` | **500 — Anthropic credit balance too low** | first token < ~2s | ⛔ blocked |

## BEFORE — component attribution (isolated timings)

| Component | Time | Note |
|---|---|---|
| bcrypt hash (cost 12) | **421 ms** | spec floor — keep at 12, do not lower |
| bcrypt verify (cost 12) | **392 ms** | inherent CPU cost on this machine |
| DB **cold** connect (first pool conn: TLS + pooler auth + pre_ping) | **5958 ms** | == the entire register-cold 6s |
| DB **warm** round-trip per checkout (incl `pool_pre_ping` SELECT 1) | **~1297 ms** | ≈ 0.6–0.7 s per *single* RTT |
| `embed_texts` "warm" for 1 short string | **1946 ms** | model encode is ~tens of ms; the rest is `record_llm_call` doing a **synchronous DB INSERT+commit** |
| `storage.put_object` (Supabase Storage, incl `_ensure_bucket` head+create) | 3149 ms cold / 1512 ms warm | network I/O to Supabase Storage |

## Root causes (what the numbers prove)

1. **`pool_pre_ping=True` wastes one full RTT (~0.65 s) on every request** — a
   `SELECT 1` before the real query. Biggest avoidable warm-latency tax.
   (`db.py:10`)
2. **No DB pool warmup at startup** → the *first* request pays ~6 s to establish
   the first pooled connection (TLS + pooler auth). Register was that first
   request. (`main.py` lifespan warms the embed model but not the DB pool.)
3. **`record_llm_call` blocks the request with a synchronous INSERT+commit**
   (its own `SessionLocal`) on **every** embed and **every** Claude call
   (`logging.py:27-41`). A chat request pays this **twice** (retrieval embed +
   LLM call) ≈ 2.6 s of pure logging I/O. Required by the rubric — but it must
   not block the response.
4. **`db.refresh(user)` in `auth.register`/`oauth_bridge` is a wasted SELECT
   RTT** (~1.3 s) — `User.id` is Python-side `uuid.uuid4` (`user.py:15`), so the
   token needs no reload. (`auth.py:58,109`)
5. **Synchronous upload holds a DB connection across ~50 s of embed+storage
   work**; the Supabase pooler closes the idle connection mid-request →
   `psycopg2.OperationalError: server closed the connection unexpectedly` on
   commit. So upload is both **slow** and **fragile**. (`materials.py:55-110`)
6. **Per-request Anthropic client construction** (`anthropic_client.py:39`) —
   minor vs the above, still avoidable.
7. **Missing indexes** on `chat_messages.created_at` and `quiz_sessions.created_at`
   (both used in `ORDER BY ... DESC`); **quiz-results N+1** (`quiz.py:~122-131`).

### Confirmed NON-problems (do not "fix")
- Handlers are sync `def` → FastAPI threadpools them; psycopg2/bcrypt do **not**
  block the event loop. **No async/asyncpg migration.**
- Embedding model already loads once at startup (lifespan + `lru_cache`).
- pgvector HNSW index already present (`material_chunks.embedding`).
- bcrypt already cost 12 (the spec floor).

## ⛔ External blocker
`/chat/message` returns **400 — "Your credit balance is too low to access the
Anthropic API."** The `ANTHROPIC_API_KEY` has no credits, so chat latency cannot
be measured and the new SSE streaming endpoint cannot be verified end-to-end
until the account is topped up.

---

## Planned fixes (ranked by measured impact) → AFTER numbers go here

1. Warm the DB pool at startup (lifespan) — kills the ~6 s first-request penalty.
2. Drop `pool_pre_ping`; rely on `pool_recycle` + TCP keepalives (+ light retry if
   needed) — saves ~0.65 s/request.
3. Make `record_llm_call` non-blocking (fire-and-forget) — saves ~1.3 s/embed and
   ~1.3 s/LLM call; ~2.6 s off chat. Log row still written.
4. Remove redundant `db.refresh()` in register/oauth — saves ~1.3 s/signup.
5. Background document ingest; compute vectors WITHOUT holding a DB session, then
   open a short session to insert+commit — fixes the 50 s wait and the dropped
   connection.
6. Reuse a single Anthropic client.
7. Add the two missing indexes (Alembic `0010`); fix quiz-results N+1.
8. Add `POST /chat/message/stream` (SSE) — verify once Anthropic credits are restored.

These were applied. AFTER numbers below.

---

## AFTER - end-to-end (probe, warm, n=5)

| Endpoint | Before | After | Target | Status |
|---|---|---|---|---|
| `/auth/register` (warm) | 6033 (cold) | **1821 ms** | < ~1500 | ~at target |
| `/auth/login` (warm median) | 1739 ms | **1536 ms** | < ~1500 | OK at target |
| `/materials/upload` | 54895 ms + 500s | **1969 ms -> `processing`** | return immediately | OK |
| `/chat/message/stream` first token | blocked | **~1.9-2.2 s** | first token < ~2s | OK (Groq) |
| upload -> background `ready` | (was the 55 s request) | **~4 s** after returning | - | OK |

> The first request after a cold start still pays a one-off ~6-38 s to open the
> very first pooled connection (network variance to the far Supabase region);
> startup `warm_pool()` absorbs most cases. The persistent **~1.3 s floor on every
> endpoint is one unavoidable round-trip to the Sydney pooler** from this location
> - in a co-located production region these numbers drop substantially.

Verified end-to-end: background upload reaches `ready` (~4 s); Groq chat grounded
with inline citation `[S1, #0]`; multilingual (RU) ok; async `llm_logs` still
written (+5 rows); `pytest` 15/15 green; migration `0010` up/down SQL generated
cleanly offline (apply to Supabase pending authorization).
