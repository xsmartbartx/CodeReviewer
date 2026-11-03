# Deployment

CodeReviewer runs as two processes from one Docker image, plus PostgreSQL:

| Process | Command | Scales |
| --- | --- | --- |
| Web (Next.js) | default image command (`next start`, port 3000) | Horizontally, stateless |
| Worker | `node dist/worker/index.mjs` | Horizontally; each process runs `WORKER_CONCURRENCY` reviews in parallel |
| Migrations | `node dist/db/migrate.mjs` | Run once per deploy, before the new web and worker start |

The queue lives in PostgreSQL (pg-boss, in its own `pgboss` schema), so there is no Redis to run.

## 1. Choose the public URL

Pick the domain first, for example `https://reviews.example.com`. GitHub webhooks, the OAuth callback, and Stripe redirects all point at it, and it becomes `APP_URL`. Serve it over HTTPS: session cookies are marked `Secure` when `APP_URL` starts with `https://`.

## 2. Create the GitHub App

### With the script (recommended)

```bash
npm run github-app:create -- --url https://reviews.example.com
```

Add `--org your-org` to own the app from an organization, and `--private` to restrict installation to that owner (useful for staging). The script opens GitHub with a pre-filled manifest, then prints six lines to copy into your environment:

```text
GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
```

### By hand

In GitHub: **Settings → Developer settings → GitHub Apps → New GitHub App**.

| Setting | Value |
| --- | --- |
| Homepage URL | `https://reviews.example.com` |
| Callback URL | `https://reviews.example.com/api/auth/callback` |
| Setup URL | `https://reviews.example.com/dashboard` (check *Redirect on update*) |
| Webhook URL | `https://reviews.example.com/api/github/webhook` |
| Webhook secret | A long random string, also set as `GITHUB_WEBHOOK_SECRET` |
| Repository permissions | Pull requests: Read and write · Contents: Read · Checks: Read and write · Issues: Read · Metadata: Read |
| Subscribe to events | Pull request · Issue comment |
| Where can it be installed | Any account (for a public SaaS) |

Then generate a client secret and a private key. Put the PEM in `GITHUB_APP_PRIVATE_KEY`, either quoted across lines or on one line with `\n` escapes. The slug is the last part of the app's public URL (`github.com/apps/<slug>`); it is also the name people mention in commands (`@<slug> review`).

## 3. Get an Anthropic API key

Create a key in the [Claude Console](https://console.anthropic.com/) and set `ANTHROPIC_API_KEY`. Only the worker uses it.

`ANTHROPIC_MODEL` (default `claude-opus-5-5`) and `ANTHROPIC_EFFORT` (default `medium`) control quality and cost. A typical review costs a few cents to a few tens of cents depending on diff size. Lower effort or a smaller model such as `claude-sonnet-5-5` reduces cost; compare quality on your own pull requests before switching. Keep plan quotas in [`src/lib/billing/plans.ts`](../src/lib/billing/plans.ts) consistent with your per-review cost.

## 4. Set up Stripe (skip to self-host without billing)

Billing is enabled only when all four `STRIPE_*` variables are set. Without them every account has unlimited reviews and the billing pages say billing is off.

1. **Products.** Create two recurring monthly prices, matching `PLANS` in `src/lib/billing/plans.ts` (Pro $39, Team $149 by default). Copy the price IDs into `STRIPE_PRICE_PRO` and `STRIPE_PRICE_TEAM`.
2. **Webhook.** Add an endpoint at `https://reviews.example.com/api/stripe/webhook` with these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. **Customer portal.** In *Settings → Billing → Customer portal*, enable payment method updates, invoice history, cancellation (at period end), and plan switching between the two prices. Plan changes for existing subscribers go through the portal so Stripe handles proration.
4. **Secret key.** Set `STRIPE_SECRET_KEY`. Use test mode keys for staging.

To test locally, forward events with the Stripe CLI and use the `whsec_...` it prints:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 5. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `APP_URL` | Yes | Public URL, no trailing slash |
| `DATABASE_URL` | Yes | PostgreSQL 14+ connection string |
| `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | For sign-in and reviews | From step 2. Until all six are set, the public site runs, sign-in shows "opens soon", webhooks return 503, and the worker idles |
| `ANTHROPIC_API_KEY` | For reviews | From step 3. The worker idles without it |
| `ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT` | No | Defaults `claude-opus-5-5`, `medium` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM` | For billing | All four, or none |
| `WORKER_CONCURRENCY` | No | Reviews per worker process, default 3 |
| `COMPANY_NAME`, `SUPPORT_EMAIL` | No | Shown on legal and docs pages. Email defaults to `support@<APP_URL host>` |

The app validates its environment on first use and fails with a list of every missing or invalid variable.

## 6. Deploy

### Docker Compose (any VM)

```bash
cp .env.example .env
```

Fill in `.env`, set a strong `POSTGRES_PASSWORD` in your shell or `.env`, then:

```bash
docker compose up -d --build
```

Compose starts PostgreSQL, runs migrations once, then starts the web app on port 3000 and the worker. Put a TLS-terminating reverse proxy (Caddy, nginx, Traefik) or a load balancer in front of port 3000. To upgrade, pull the new code and run the same command; migrations run before the new containers start.

### Render

Create a **Blueprint** from this repository. [`render.yaml`](../render.yaml) defines the web service (with migrations as the pre-deploy command), the worker, and a PostgreSQL database. Fill in the variables marked *sync: false*, then attach your domain to the web service.

### Fly.io

Create a PostgreSQL cluster and attach it (this sets `DATABASE_URL`), set secrets with `fly secrets set`, and define two process groups in `fly.toml`:

```toml
[processes]
  web = "node node_modules/next/dist/bin/next start"
  worker = "node dist/worker/index.mjs"

[deploy]
  release_command = "node dist/db/migrate.mjs"

[http_service]
  internal_port = 3000
  processes = ["web"]
```

### Railway, ECS, Kubernetes, and others

Run the image twice, once with the default command and once with `node dist/worker/index.mjs`, against the same database and environment. Run `node dist/db/migrate.mjs` as a release or init step. Point the load balancer health check at `GET /api/health`, which returns 200 when the database is reachable.

## 7. Verify

1. `GET https://reviews.example.com/api/health` returns `{"ok":true,"database":"up"}`.
2. In the GitHub App settings, **Advanced → Recent deliveries** shows a successful `ping`.
3. Sign in, install the app on a test repository, and open a pull request. A `CodeReviewer` check appears within seconds and the review within a few minutes.
4. With billing on, upgrade a test account using a [Stripe test card](https://docs.stripe.com/testing) and confirm the plan changes on the billing page.

## Operations

- **Logs.** The worker logs one line per review (`[worker] owner/repo#12 completed in 48211ms`) and full errors for failures. Failed reviews also appear in the dashboard with the error message.
- **Retries.** A failed review is retried twice with exponential backoff. Retries update the same review row.
- **Maintenance.** The worker runs a daily job that deletes expired sessions, old webhook delivery IDs, and review history older than 24 months (the retention stated in the privacy policy).
- **Backups.** Back up PostgreSQL daily. The database holds accounts, subscriptions mirrored from Stripe, and review metadata; no source code.
- **Scaling.** Add worker processes when reviews queue up; reviews for the same pull request never run concurrently. The web tier is stateless.
- **Upgrades.** Deploy the new image, run migrations, then restart web and worker. Migrations are additive within a release.

The hosted instance at `codereviewer.onenexora.com` runs on the NEXORA host and is deployed, backed up and monitored with the NEXORA platform; see [nexora-integration.md](nexora-integration.md).
