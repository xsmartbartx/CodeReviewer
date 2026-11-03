import Link from "next/link";
import { PricingCards } from "@/components/pricing";
import { ButtonLink } from "@/components/ui";

const features = [
  {
    title: "Comments on the exact line",
    body: "Findings land inline on the diff with a severity, the reason it matters, and a one-click suggested fix when the change is local.",
    icon: "M8 10h8M8 14h5M5 4h14a1 1 0 011 1v11a1 1 0 01-1 1h-6l-4 3v-3H5a1 1 0 01-1-1V5a1 1 0 011-1z",
  },
  {
    title: "A summary reviewers actually read",
    body: "Every review opens with what the pull request does and a file-by-file walkthrough, so the human reviewer knows where to look first.",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
  {
    title: "Incremental on every push",
    body: "After the first review, only new commits are reviewed. Force pushes fall back to a full review automatically.",
    icon: "M4 4v6h6M20 20v-6h-6M5.6 15A7 7 0 0018 17M18.4 9A7 7 0 006 7",
  },
  {
    title: "Gates that fit your workflow",
    body: "Start advisory. When you trust the signal, turn on request-changes and a failing check for critical and major findings.",
    icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z",
  },
  {
    title: "Configured in your repo",
    body: "A short .codereviewer.yaml sets the tone, language, path filters, and review rules per directory. Existing .coderabbit.yaml files work too.",
    icon: "M10 20l4-16M6 16l-4-4 4-4M18 8l4 4-4 4",
  },
  {
    title: "Your code stays yours",
    body: "Diffs are sent to the model to produce the review and are never stored. We keep review metadata only, and the model provider does not train on API data by default.",
    icon: "M12 11c1.7 0 3-1.3 3-3V6a3 3 0 10-6 0v2c0 1.7 1.3 3 3 3zM6 11h12v9H6z",
  },
];

const faqs = [
  {
    q: "Which model reviews my code?",
    a: "Claude, by Anthropic. Reviews use adaptive reasoning and structured output so every comment points at a real line in your diff.",
  },
  {
    q: "Do you store my source code?",
    a: "No. The diff is fetched from GitHub when a review runs, sent to the model, and discarded. We store review metadata: counts, the summary, timing, and token usage.",
  },
  {
    q: "What counts as a review?",
    a: "One completed review of a pull request, whether triggered by a push or a comment. Skipped reviews (drafts, ignored titles, no reviewable files) and failed reviews do not count.",
  },
  {
    q: "Can it block merges?",
    a: "Yes, opt in. Set request_changes: true and protect your branch with the CodeReviewer check. Critical and major findings then fail the check.",
  },
  {
    q: "Does it work with pull requests from forks?",
    a: "Yes. For fork pull requests the configuration is read from your base branch, so an outside contributor cannot change your review rules.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Manage or cancel your subscription from the billing page. You keep your plan until the end of the period, then return to the free tier.",
  },
];

function ReviewMock() {
  return (
    <div className="shadow-brand-600/10 overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800">
        <span className="font-mono">src/auth/login.ts</span>
      </div>
      <div className="font-mono text-[12.5px] leading-6">
        <div className="flex bg-red-50/70 dark:bg-red-500/10">
          <span className="w-10 shrink-0 pr-2 text-right text-zinc-400 select-none"> </span>
          <span className="pr-4 text-red-700 dark:text-red-300">- const user = await db.findUser(email);</span>
        </div>
        <div className="flex bg-emerald-50/70 dark:bg-emerald-500/10">
          <span className="w-10 shrink-0 pr-2 text-right text-zinc-400 select-none">41</span>
          <span className="pr-4 text-emerald-800 dark:text-emerald-300">
            + const user = await db.findUser(email.trim());
          </span>
        </div>
        <div className="flex bg-emerald-50/70 dark:bg-emerald-500/10">
          <span className="w-10 shrink-0 pr-2 text-right text-zinc-400 select-none">42</span>
          <span className="pr-4 text-emerald-800 dark:text-emerald-300">+ if (user.password === password) {"{"}</span>
        </div>
      </div>
      <div className="m-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-sans dark:border-zinc-700 dark:bg-zinc-800/60">
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-brand-600 flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white">
            CR
          </span>
          <span className="font-semibold">codereviewer</span>
          <span className="rounded border border-zinc-300 px-1.5 text-[10px] text-zinc-500 dark:border-zinc-600">
            bot
          </span>
        </div>
        <p className="mt-3 text-sm">
          <strong>🔴 Critical · Security:</strong> Passwords compared in plain text and with a timing leak
        </p>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <code className="rounded bg-zinc-200/70 px-1 dark:bg-zinc-700">user</code> can be null for unknown emails, and
          comparing raw passwords means they are stored unhashed. Verify against the stored hash instead.
        </p>
        <div className="mt-3 overflow-hidden rounded-md border border-zinc-200 font-mono text-[12px] dark:border-zinc-700">
          <div className="bg-zinc-100 px-3 py-1 font-sans text-xs text-zinc-500 dark:bg-zinc-800">Suggested change</div>
          <div className="bg-emerald-50/70 px-3 py-1 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            + if (user && (await verifyHash(user.passwordHash, password))) {"{"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_top,var(--color-brand-100),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.25),transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-20 pb-24 sm:px-6 lg:grid-cols-2 lg:pt-28">
          <div>
            <p className="border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-600/30 dark:bg-brand-600/10 dark:text-brand-400 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              Powered by Claude
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Catch the bug before your reviewer has to.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              CodeReviewer reviews every GitHub pull request in minutes: a clear summary, comments on the exact line,
              and fixes you can apply with one click.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/login?next=/dashboard" className="px-5 py-2.5 text-base">
                Start free on GitHub
              </ButtonLink>
              <ButtonLink href="/docs" variant="secondary" className="px-5 py-2.5 text-base">
                Read the docs
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-zinc-500">20 free reviews every month. No credit card.</p>
          </div>
          <ReviewMock />
        </div>
      </section>

      <section
        id="features"
        className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Reviews your team will keep turned on</h2>
          <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Noise is why teams switch AI review off. CodeReviewer reports concrete defects with honest severities and
            lets you decide how loud it should be.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="text-brand-600 size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={f.icon} />
                </svg>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Live in three steps</h2>
            <ol className="mt-8 space-y-6">
              {[
                [
                  "Install the GitHub App",
                  "Pick the repositories to review. Permissions are limited to pull requests, checks, and read-only contents.",
                ],
                [
                  "Open a pull request",
                  "A review starts automatically. Drafts and titles containing WIP are skipped until they are ready.",
                ],
                ["Read, apply, merge", "Apply suggestions from GitHub, push, and only the new commits get reviewed."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="bg-brand-600 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-950 p-5 font-mono text-[13px] leading-6 text-zinc-300 dark:border-zinc-800">
              <div className="mb-3 text-xs text-zinc-500">.codereviewer.yaml</div>
              <pre className="overflow-x-auto">{`profile: chill          # quiet | chill | assertive
language: en-US
request_changes: false   # turn on once you trust it

path_filters:
  - "!**/__generated__/**"

path_instructions:
  - path: "src/api/**"
    instructions: >
      Every handler must check the caller's
      permissions before touching data.
  - path: "**/*.sql"
    instructions: Flag migrations that lock large tables.`}</pre>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Optional. Without a config file you get sensible defaults.{" "}
              <Link href="/docs#configuration" className="text-brand-600 underline">
                Full reference
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Simple pricing per GitHub account</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-zinc-600 dark:text-zinc-400">
            One plan covers every repository and every developer in the account. Upgrade, downgrade, or cancel any time.
          </p>
          <div className="mt-12">
            <PricingCards
              action={(plan) => (
                <ButtonLink
                  href="/login?next=/dashboard"
                  variant={plan.id === "pro" ? "primary" : "secondary"}
                  className="w-full"
                >
                  {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
                </ButtonLink>
              )}
            />
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
          <dl className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  <dt>{f.q}</dt>
                  <span className="text-zinc-400 transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <dd className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{f.a}</dd>
              </details>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="bg-brand-600 mx-auto max-w-6xl rounded-2xl px-6 py-14 text-center text-white sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight">Your next pull request could be reviewed in minutes.</h2>
          <p className="text-brand-100 mx-auto mt-3 max-w-xl">
            Install the GitHub App, open a pull request, and see what it finds.
          </p>
          <Link
            href="/login?next=/dashboard"
            className="text-brand-700 hover:bg-brand-50 mt-8 inline-flex rounded-lg bg-white px-5 py-2.5 font-medium shadow-sm"
          >
            Start free
          </Link>
        </div>
      </section>
    </>
  );
}
