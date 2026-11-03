# Contributing

## Setup

Follow the quick start in [README.md](README.md). Tests do not need Docker, GitHub, or an API key: they use an in-memory PostgreSQL (PGlite) and fake GitHub and model clients.

## Before opening a pull request

```bash
npm run lint && npm run typecheck && npm run format:check && npm test
```

CI runs the same checks plus a production build and a Docker build.

## Conventions

- **Tests with behaviour changes.** Engine changes get a case in `tests/review.test.ts`, webhook changes in `tests/webhooks.test.ts`, worker and quota changes in `tests/worker.test.ts`.
- **Schema changes.** Edit `src/db/schema.ts`, run `npm run db:generate -- --name <change>`, and commit the generated SQL. Never edit an applied migration.
- **Config changes.** Edit `src/lib/config/schema.ts`, run `npm run schema:generate`, and update the reference table on the docs page (`src/app/(marketing)/docs/page.tsx`).
- **Prompt changes.** Keep `SYSTEM_PROMPT` in `src/lib/review/prompt.ts` free of per-request content so it stays cacheable. Check a change with `npm run smoke:review` and real pull requests before merging.
- **Secrets.** Never log tokens, diffs, or environment values. Review rows store metadata only.
