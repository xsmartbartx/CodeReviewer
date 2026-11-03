# NEXORA integration

The hosted CodeReviewer at `codereviewer.onenexora.com` is a NEXORA product. This page is the
CodeReviewer side of the plan. The decision and the Core side are in NEXORA's
`docs/adr/ADR-0015-codereviewer-on-core.md`. Each phase is off until its env variables are set,
so a self-hosted install is unaffected.

## Phase 1: listed and operated

Nothing changes in this repository except documentation. NEXORA lists CodeReviewer on
onenexora.com (product page, AI pillar, pricing, sitemap), adds it to the status page, the uptime
workflow (`/api/health`) and the Control Center, and runs it like its other products:

- **Deploy:** `/opt/nexora/infrastructure/deployment/deploy.sh codereviewer`. It takes the host's
  deploy lock, pulls `main` into `/home/opc/codereviewer`, builds the image (`docker compose build
  migrate`) and runs `docker compose up -d`, which migrates before web and worker restart.
- **Backups:** the nightly `backup-all.sh` dumps `codereviewer-postgres-1` (including the pg-boss
  schema) into the platform archive and copies it off-site. The monthly restore drill restores
  it into a throwaway container.

## Phase 2: billing through NEXORA Console

| Variable              | Where        | Purpose                                                                 |
| --------------------- | ------------ | ----------------------------------------------------------------------- |
| `NEXORA_SYNC_SECRET`  | CodeReviewer | Shared with Core's `CODEREVIEWER_SYNC_SECRET`. Turns phase 2 on          |
| `NEXORA_CONSOLE_URL`  | CodeReviewer | Where the link flow sends an organisation admin. Default Console URL     |

- `POST /api/internal/org-plan` receives an organisation's plan from Core. It is HMAC-signed with
  a 5-minute replay window, idempotent, and ignores updates older than the stored one.
- An account can be **linked** to a NEXORA organisation from its billing page. This needs a
  fresh GitHub sign-in by the account's owner, or by the person who installed the app on it,
  plus an organisation admin's confirmation in Console. Both are bound to one browser by a
  single-use nonce.
- The effective plan is the higher of the account's own subscription and its organisation's
  plan. Quotas are still enforced here, from this database.
- An unlinked account keeps CodeReviewer's own Stripe checkout and portal. The Stripe webhook
  ignores Core's subscriptions (those with `orgId` metadata), and Core ignores ours (`accountId`).
- **Rollback:** unset `NEXORA_SYNC_SECRET`. The endpoint answers 404 and every account is back on
  its own plan. The added columns and table stay unused.

## Phase 3: NEXORA sign-in

- Clerk on the shared NEXORA instance, next to GitHub sign-in, off until `CLERK_SECRET_KEY` and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are set.
- Someone signed in with Clerk sees the accounts linked to their active organisation. Admins
  link, unlink and manage billing. Someone signed in with GitHub sees what GitHub lists for them,
  as today.
- **Rollback:** unset the Clerk keys.
