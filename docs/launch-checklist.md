# Launch checklist

What to do before charging customers. The code is ready; these items are business, legal, and operational decisions only you can make.

## Brand and legal

- [ ] **Name.** "CodeReviewer" is a working name and generic enough that it may not be protectable. Check trademarks and domain availability in your markets, then update `site.name` in `src/lib/site.ts`, the logo in `src/components/logo.tsx`, and `src/app/icon.svg`.
- [ ] **Legal entity.** Set `COMPANY_NAME` to the entity that contracts with customers.
- [ ] **Terms and Privacy Policy.** `src/app/(marketing)/terms` and `privacy` are a starting point written for this product. Have a lawyer review them for your jurisdiction, especially liability, refunds, data processing (a DPA for EU customers), and sub-processors.
- [ ] **License.** `LICENSE.md` is proprietary. Change it if you intend to open-source the code or sell self-hosted licences.
- [ ] **Usage policies.** Confirm your use complies with the [Anthropic usage policy](https://www.anthropic.com/legal/aup) and the [GitHub Marketplace developer agreement](https://docs.github.com/en/site-policy/github-terms/github-marketplace-developer-agreement) if you list there.

## Pricing and costs

- [ ] Run `npm run smoke:review` and a few real pull requests, then compare the tokens shown on each review page with [Anthropic pricing](https://www.anthropic.com/pricing). Multiply by each plan's `reviewsPerMonth` and confirm the margin in `src/lib/billing/plans.ts`.
- [ ] Decide the model and effort (`ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT`) from those measurements.
- [ ] Set an Anthropic spend limit and usage alerts in the Claude Console.
- [ ] Create the live Stripe prices, webhook, and customer portal (see [deployment.md](deployment.md#4-set-up-stripe-skip-to-self-host-without-billing)). Turn on Stripe Tax if you need to collect VAT or sales tax, and add `automatic_tax: { enabled: true }` to the Checkout session in `src/lib/billing/stripe.ts`.

## Production setup

- [ ] Production GitHub App registered against the real domain, set to install on any account.
- [ ] HTTPS on `APP_URL`; `GET /api/health` monitored by an uptime service.
- [ ] Daily PostgreSQL backups, with one restore tested.
- [ ] Log retention and an alert on repeated `[worker] ... failed` lines.
- [ ] A support inbox at `SUPPORT_EMAIL` that someone reads.
- [ ] A separate staging deployment with its own GitHub App (`--private`) and Stripe test keys.

## Go to market

- [ ] Test the full journey as a new customer: landing page, sign-in, install, first review, upgrade, portal, cancel.
- [ ] List the app on the [GitHub Marketplace](https://docs.github.com/en/apps/github-marketplace) (optional; it requires a verified publisher).
- [ ] Add analytics if you need them, and update the privacy policy to match.
