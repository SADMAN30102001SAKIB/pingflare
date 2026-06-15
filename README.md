# PingFlare

PingFlare is a multi-user uptime monitoring app for HTTP APIs, built for a split Cloudflare stack:
static frontend on Pages, API and scheduled checks on Workers, storage in D1.

## Product Shape

- Users can sign up and log in.
- Each user manages their own monitors from the UI.
- Each monitor has its own Telegram bot token and chat ID if alerts are needed.
- Each monitor can choose its own check interval.
- Each monitor can expose a public status page by slug.
- A one-minute Cloudflare Cron Trigger wakes the Worker; the Worker only checks monitors that are due.
- The frontend is a static SPA and talks to the Worker API with bearer tokens.

## Stack

- Cloudflare Pages for the frontend
- Cloudflare Workers + Hono for the backend API and scheduler
- Cloudflare D1 for data
- React + TanStack Router + Vite
- TypeScript

## Main Routes

Frontend routes:

```txt
/
/login
/signup
/app
/app/monitors/new
/app/monitors/:monitorId
/status/:slug
```

Worker API routes:

```txt
POST /api/auth/signup
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout

GET /api/app/dashboard
GET /api/app/monitors
POST /api/app/monitors
GET /api/app/monitors/:id
PATCH /api/app/monitors/:id
DELETE /api/app/monitors/:id

GET /api/public/status/:slug
GET /api/health
```

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create local env:

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars
```

On PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item .dev.vars.example .dev.vars
```

## D1 Setup

Create the database:

```bash
pnpm exec wrangler d1 create pingflare
```

Put the real `database_id` into `wrangler.jsonc`.

Apply migrations locally:

```bash
pnpm exec wrangler d1 migrations apply pingflare --local
```

Apply migrations remotely:

```bash
pnpm exec wrangler d1 migrations apply pingflare --remote
```

Migration files:

```txt
migrations/0001_auth.sql
migrations/0002_monitors.sql
migrations/0003_checks_incidents.sql
```

Cloudflare Pages uses `public/\_redirects` so direct visits to SPA
routes like `/app` and `/status/:slug` load correctly.

## Development

Run the frontend and Worker together:

```bash
pnpm dev
```

Run only the Cloudflare Pages-style frontend dev server:

```bash
pnpm dev:pages
```

Run only the Worker API and scheduler:

```bash
pnpm dev:worker
```

Frontend:

```txt
http://localhost:5173
```

Worker:

```txt
http://localhost:8787
```

Trigger the scheduled monitor job locally:

```txt
http://localhost:8787/__scheduled
```

## Check Intervals

Cloudflare Cron is configured to run every minute. Individual monitor intervals are stored in D1,
so users can choose intervals like 1, 5, 10, 15, 30, or 60 minutes from the monitor form.

The scheduler skips a monitor until its `last_checked_at` is older than its selected interval.

## Telegram

Telegram is configured per monitor from the app UI.

Each monitor can store:

- `telegramBotToken`
- `telegramChatId`
- `telegramEnabled`

Get the bot token from `@BotFather`.

Get the chat ID by messaging the bot directly or by adding it to a Telegram group and sending a message there. Then call:

https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates

Use `message.chat.id` from the response. Group/supergroup IDs are usually negative, for example `-1001234567890`.

## Verification

The current codebase has been verified with:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm exec wrangler d1 migrations apply pingflare --local
```
