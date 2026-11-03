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

- `POST /api/internal/org-plan` receives an organisation's plan from Core: body
  `{"clerk_org_id", "plan_id", "as_of"}` (`as_of` is the Stripe event time in Unix seconds),
  headers `X-Nexora-Timestamp` and `X-Nexora-Signature` = hex
  `HMAC-SHA256(secret, "<timestamp>.<body>")`. It has a 5-minute replay window, is idempotent,
  and ignores updates older than the stored one.
- An account can be **linked** to a NEXORA organisation from its billing page. This needs a
  fresh GitHub sign-in by the account's owner, or by the person who installed the app on it
  (recorded from the `installation.created` webhook), plus an organisation admin's confirmation
  in Console. Both are bound to one browser by a single-use nonce:
  1. `/api/nexora/link/continue?account=<login>` creates the request and sends the browser to
     `<NEXORA_CONSOLE_URL>/link/codereviewer?account=<id>&login=<login>&nonce=<nonce>`.
  2. Console redirects to `/api/nexora/link/complete?grant=<base64url JSON>&ts=<t>&sig=<hex>`.
     The JSON is `{org_id, org_name, account_id, nonce, plan_id}` and the signature is
     `HMAC-SHA256(secret, "link.<t>.<JSON>")`, valid for 10 minutes.
- The effective plan is the higher of the account's own subscription and its organisation's
  plan. Quotas are still enforced here, from this database. With `NEXORA_SYNC_SECRET` set, plans
  apply even without CodeReviewer's own Stripe variables (unlinked accounts are then Free).
- An unlinked account keeps CodeReviewer's own Stripe checkout and portal. The Stripe webhook
  ignores Core's subscriptions (those with `orgId` metadata), and Core ignores ours (`accountId`).
- **Rollback:** unset `NEXORA_SYNC_SECRET`. The endpoint answers 404 and every account is back on
  its own plan. The added columns and table stay unused.

## Phase 3: NEXORA sign-in

| Variable                | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `CLERK_SECRET_KEY`      | The NEXORA Clerk instance's secret key. With the publishable key, turns phase 3 on |
| `CLERK_PUBLISHABLE_KEY` | Its publishable key (`pk_live_...`), read at runtime                              |
| `NEXORA_ACCOUNT_URL`    | Where people sign in and pick an organisation. Default NEXORA's account app       |
| `GITHUB_SIGNIN`         | `off` hides GitHub sign-in once everyone uses NEXORA. Default `on`                |

- Clerk on the shared NEXORA instance (`clerk.onenexora.com`), next to GitHub sign-in. It runs
  server-side only (`src/proxy.ts`): no Clerk script in the browser, and Clerk's handshake
  redirect refreshes an expired session. Only tokens for this app's origin are accepted.
- Someone signed in with NEXORA sees exactly the accounts linked to their active organisation.
  Admins of it manage billing and can unlink; members can see reviews and toggle repositories.
  Someone signed in with GitHub sees what GitHub lists for them, as today. A GitHub session wins
  when both exist (linking needs one), and signing out ends it first.
- Signing out of a NEXORA-only session ends it everywhere (one session across NEXORA apps).
- Linking stays as in phase 2: it always needs the GitHub sign-in by the owner or installer.
- **Rollback:** unset the Clerk keys. Everyone is back on GitHub sign-in; the added
  `users.clerk_user_id` column stays unused.
