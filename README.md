# ReachInbox Scheduler — Round 1 Assignment

A production-shaped email job scheduler service + dashboard, built for the
Outbox Labs (ReachInbox.ai) hiring assignment.

## Stack

- **Backend**: TypeScript, Express, BullMQ (Redis-backed), Prisma + Postgres
- **Frontend**: React + Vite, TypeScript, Tailwind CSS
- **Email**: Ethereal (fake SMTP) via Nodemailer
- **Search**: Postgres `ILIKE` (see trade-offs below)
- **Notifications**: Slack (real OAuth v2 "Add to Slack" flow)
- **Queue dashboard**: `@bull-board/express` (live BullMQ visibility)
- **Infra**: Docker Compose for Postgres + Redis

## Quick start

```bash
# 1. infra
docker compose up -d          # postgres:5432, redis:6379

# 2. backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev                   # API on :4000, dashboard at /admin/queues
npm run worker:dev            # run in a second terminal — the queue consumer

# 3. frontend
cd frontend
npm install
npm run dev                   # :5173, proxies /api -> :4000
```

Open http://localhost:5173, click "Continue with Google" (see OAuth
trade-off below), and compose a campaign. Sent-message previews are logged
to the worker console as Ethereal preview URLs (`nodemailer.getTestMessageUrl`).

## Architecture

**Scheduling.** Each recipient in a campaign becomes its own
`ScheduledEmail` row in Postgres *and* its own BullMQ delayed job, added
with `jobId = row.id`. Two consequences:
- **No cron anywhere** — BullMQ's delayed jobs (backed by a Redis sorted
  set under the hood) are the only scheduling mechanism.
- **Idempotency for free** — BullMQ ignores `add()` calls that reuse a
  `jobId` still in the queue, so re-running the enqueue logic (e.g. during
  restart recovery) can never create a duplicate job. The worker also
  double-checks the DB row's status (`!== SENT`) before actually sending,
  which is the real idempotency backstop against BullMQ's at-least-once
  delivery.

**Restart persistence.** Two layers:
1. Redis itself persists (AOF, see `docker-compose.yml`), so already-queued
   delayed jobs survive an API/worker process restart on their own.
2. `src/bootstrap/recoverJobs.ts` runs at boot and re-enqueues any
   non-SENT DB row whose BullMQ job is missing (covers the crash window
   between "row inserted" and "job enqueued", or a Redis data-loss
   scenario). Safe to run every boot — see idempotency note above.

**Rate limiting** (`src/services/rateLimiter.ts`). Redis `INCR` on a key
scoped to `sender + current-hour-window`, with `PEXPIRE` set on first hit.
Atomic across any number of worker processes/instances — not in-memory,
so it's correct under real concurrency. When a job finds the sender's
window full, the worker moves that row's `scheduledAt` to the *next* hour
boundary and re-enqueues it (same `jobId`) rather than dropping or failing
it, and fires a Slack notification.

**Trade-off**: fixed hourly buckets (not a true sliding window) mean a
small burst is possible right at a window boundary. A Redis sorted-set
sliding window would remove that at the cost of more Redis ops/memory —
didn't seem justified for this assignment's scope.

**Min delay between sends.** Enforced via BullMQ's own worker `limiter:
{ max: 1, duration: MIN_DELAY_MS }` rather than a manual `sleep()` in the
job handler — throttles the whole worker's processing rate without
blocking a worker slot or the event loop.

**Concurrency.** `WORKER_CONCURRENCY` env var passed straight to BullMQ's
`Worker` options.

**Search.** `GET /api/emails/scheduled?search=` and `/sent?search=` use
Postgres `ILIKE` (Prisma `contains` + `mode: insensitive`) over recipient
and subject — see trade-offs below for why this was used instead of
Elasticsearch.

## Trade-offs & shortcuts (read this before the demo)

Built overnight against a same-morning deadline — prioritized the queue
engineering (scheduling, persistence, idempotency, rate-limiting) since
that's the actual substance of the assignment, and consciously simplified
one peripheral integration:

1. **Google OAuth (real).** Full Authorization Code flow via
   `passport-google-oauth20`: `GET /api/auth/google` redirects to Google's
   consent screen, Google redirects back to `/api/auth/google/callback`,
   the backend exchanges the code server-side for the profile, mints its
   own JWT, and redirects the frontend to `/auth/callback?token=...` where
   the SPA stores it. Session-less (`{ session: false }`) — the JWT is
   what authenticates subsequent API calls, no server-side session store
   needed.

   **Setup required** (you must do this — needs your own Google Cloud
   project):
   1. Go to https://console.cloud.google.com/ → create/select a project
   2. APIs & Services → OAuth consent screen → configure (External, add
      your email as a test user if the app is in Testing mode)
   3. APIs & Services → Credentials → Create Credentials → OAuth client ID
      → Application type: **Web application**
   4. Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
   5. Copy the generated **Client ID** and **Client Secret** into
      `backend/.env`:
      ```
      GOOGLE_CLIENT_ID=your-client-id
      GOOGLE_CLIENT_SECRET=your-client-secret
      GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
      FRONTEND_URL=http://localhost:5173
      ```
   6. Restart the backend after editing `.env`.

2. **Slack (real OAuth "Add to Slack" flow).** `GET /api/slack/oauth/start`
   redirects to Slack's actual authorize screen (`scope=incoming-webhook`);
   the user picks a channel and approves; Slack redirects back to
   `/api/slack/oauth/callback` with a code, which the backend exchanges
   server-side at `oauth.v2.access` for an access token **and** a
   channel-specific `incoming_webhook.url` — obtained via OAuth, not
   manually pasted. That webhook URL is what actually delivers the live
   rate-limit notification.

   **Setup required** (needs your own Slack app, free):
   1. Go to https://api.slack.com/apps → **Create New App** → From scratch
   2. **OAuth & Permissions** → under "Redirect URLs" add:
      `http://localhost:4000/api/slack/oauth/callback`
   3. Under **Bot Token Scopes** *or* the "Incoming Webhooks" feature page,
      enable **Incoming Webhooks** and ensure the `incoming-webhook` scope
      is requested (Slack's newer app UI adds this automatically once
      Incoming Webhooks is toggled on)
   4. **Basic Information** → copy the **Client ID** and **Client Secret**
      into `backend/.env`:
      ```
      SLACK_CLIENT_ID=your-client-id
      SLACK_CLIENT_SECRET=your-client-secret
      SLACK_REDIRECT_URI=http://localhost:4000/api/slack/oauth/callback
      ```
   5. Restart the backend. In the dashboard, click **"+ Connect Slack"**
      (top toolbar) → approve on Slack's consent screen → pick a channel.
   6. Trigger a rate-limit hit (set an hourly limit of 1–2 on a campaign
      with several recipients) and watch the message land in that channel.

3. **Search uses Postgres `ILIKE` instead of Elasticsearch.** Standing
   up and indexing into an ES cluster (plus keeping it in sync with
   Postgres) was the most time-expensive item relative to what it
   demonstrates for this assignment's scope. Postgres full-text search
   covers the same user-facing requirement (searchable scheduled/sent
   emails) for this dataset size; a real production version would add an
   ES (or Postgres `tsvector`) pipeline, likely via the outbox pattern,
   as data volume grew.

Everything else in the spec — BullMQ delayed jobs, no-cron constraint,
restart-safe persistence, idempotency, configurable concurrency, min-delay
throttling, Redis-backed per-sender hourly rate limiting with
reschedule-not-drop behavior, live BullMQ dashboard, real Google OAuth
login, real Slack OAuth with live notifications, and the full
compose/scheduled/sent frontend with loading + empty states — is
implemented, not mocked. Only search is simplified, as explained above.

## Environment variables

See `backend/.env.example`. Leave `ETHEREAL_USER`/`ETHEREAL_PASS` blank to
auto-generate a fresh Ethereal test inbox on first send (logged to the
worker console).

## Known sandbox limitation (not a code issue)

`prisma generate` could not download its query-engine binary in the
environment this was built in (network egress restricted to a small
allow-list that didn't include `binaries.prisma.sh`). Run
`npx prisma generate` (or `prisma migrate dev`, which runs it
automatically) on a machine with normal internet access — this is a
one-time step and unrelated to the application code.

## What I'd do next with more time

- Sliding-window (sorted-set based) rate limiter instead of fixed hourly
  buckets
- Elasticsearch (or Postgres `tsvector`) indexing pipeline for search, via
  the outbox pattern for transactional consistency with Postgres
- Integration tests around the restart-recovery path (kill worker mid-job,
  assert exactly-once delivery)
- Load test the 1000+-emails-at-once scenario end-to-end (current design
  handles it via BullMQ delayed jobs + per-window rate limiting, but
  wasn't exercised at that scale against real Ethereal sends)
