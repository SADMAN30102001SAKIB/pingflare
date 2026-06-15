# Deploy To Cloudflare

This project can be deployed two ways:

- Manual deploy from your machine.
- Cloudflare Git integration from GitHub push events.

The Cloudflare-managed CI/CD flow is:

```txt
push to main
-> Cloudflare Pages builds and deploys the frontend
-> Cloudflare Workers Builds deploys the Worker backend
```

## 1. Confirm Cloudflare Account

Check `wrangler.jsonc` before deploying.

If this is not your Cloudflare account ID, replace it or remove the field:

```jsonc
"account_id": "fbca92db4dd551f67f6e982d4a70a914"
```

You can check your active Wrangler login with:

```bash
pnpm exec wrangler whoami
```

## 2. Create D1

```bash
pnpm exec wrangler d1 create pingflare
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing:

```txt
bdcc209d-89b0-4f5f-8e4a-2e461c145b02
```

Apply remote migrations:

```bash
pnpm db:migrate:remote
```

Current migration files:

```txt
migrations/0001_auth.sql
migrations/0002_monitors.sql
migrations/0003_checks_incidents.sql
```

## 3. Deploy Worker

Deploy the backend Worker:

```bash
pnpm exec wrangler deploy
```

The Worker hosts:

- auth API
- monitor CRUD API
- public status API
- scheduled uptime checks

The Worker cron wakes every minute. Individual monitor intervals are stored in D1, so each monitor
is checked only when it is due.

Copy the deployed Worker URL. It will look like:

```txt
https://pingflare-api.<your-subdomain>.workers.dev
```

## 4. Connect Pages To GitHub

In Cloudflare dashboard:

```txt
Workers & Pages -> Create application -> Pages -> Connect to Git
```

Select the GitHub repository and production branch.

Recommended Pages settings:

```txt
Build command: pnpm build
Build output directory: dist
```

The app is a static SPA. `public/_redirects` is included so
Cloudflare Pages serves `index.html` when someone opens routes like `/login`, `/app`, or
`/status/<slug>` directly.

Set this Pages environment variable before the Pages build:

```txt
VITE_API_BASE_URL=https://your-worker-url.workers.dev
```

After this, Cloudflare Pages automatically deploys the frontend whenever you push to the connected
branch.

For manual Pages deploy only:

```bash
pnpm run deploy:pages
```

## 5. Connect Worker To GitHub

In Cloudflare dashboard:

```txt
Workers & Pages -> select pingflare-api -> Settings -> Builds -> Connect
```

Select the same GitHub repository and production branch.

Recommended Worker build settings:

```txt
Root directory: /
Build command: pnpm typecheck && pnpm lint
Deploy command: pnpm deploy:worker
```

The Worker name in Cloudflare must match the `name` in `wrangler.jsonc`:

```txt
pingflare-api
```

After this, Cloudflare Workers Builds automatically deploys the backend whenever you push to the
connected branch.

Run migrations manually before deploy:

```bash
pnpm db:migrate:remote
```

## 6. Lock Down CORS

After Pages deploys, copy your Pages URL. It will look like:

```txt
https://pingflare.pages.dev
```

Update `wrangler.jsonc`:

```jsonc
"vars": {
  "PUBLIC_ORIGIN": "https://pingflare.pages.dev"
}
```

During local development, `PUBLIC_ORIGIN` can stay as `http://localhost:5173` in `.dev.vars`.

Commit the updated `PUBLIC_ORIGIN` in `wrangler.jsonc`
and push to the connected branch. Cloudflare Workers Builds will redeploy the Worker.

## 7. Test Production

Test Worker endpoints:

```txt
https://your-worker-url.workers.dev/api/health
```

Expected response:

```json
{ "ok": true }
```

Then open the Pages app, sign up, create a monitor, and verify:

1. Dashboard loads after login.
2. Monitor create/edit works.
3. The monitor has `Public status page` enabled.
4. The monitor has a unique public slug.
5. Public status page works at `/status/<slug>` on the Pages app.
6. The Worker public API works at `/api/public/status/<slug>`.
7. Telegram alert sends when the monitor is configured and a downtime occurs.

Example public URLs after creating a monitor with slug `acme-api`:

```txt
https://pingflare.pages.dev/status/acme-api
https://your-worker-url.workers.dev/api/public/status/acme-api
```
