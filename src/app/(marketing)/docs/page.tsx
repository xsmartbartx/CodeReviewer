import Link from "next/link";
import { BUILT_IN_EXCLUDES, DEFAULT_CONFIG } from "@/lib/config/schema";
import { operator } from "@/lib/site";

export const metadata = { title: "Documentation", description: "Install, configure, and self-host CodeReviewer." };
export const dynamic = "force-dynamic";

const sections = [
  ["getting-started", "Getting started"],
  ["configuration", "Configuration"],
  ["commands", "Commands"],
  ["how-reviews-work", "How reviews work"],
  ["coderabbit", "Migrating from CodeRabbit"],
  ["billing", "Plans and usage"],
  ["security", "Security and privacy"],
  ["self-hosting", "Self-hosting"],
] as const;

const json = (value: unknown) => JSON.stringify(value);

const fields: Array<[string, string, string, string]> = [
  ["language", "string", json(DEFAULT_CONFIG.language), "Language for every comment and summary, for example pl-PL or de-DE."],
  ["profile", "quiet | chill | assertive", json(DEFAULT_CONFIG.profile), "quiet posts critical and major findings, chill adds minor ones, assertive adds nits."],
  ["instructions", "string", '""', "Team-wide guidance included in every review (up to 4,000 characters)."],
  ["request_changes", "boolean", json(DEFAULT_CONFIG.request_changes), "Submit Request changes and fail the check when a critical or major finding is posted."],
  ["summary", "boolean", json(DEFAULT_CONFIG.summary), "Include the high-level summary in the review body."],
  ["walkthrough", "boolean", json(DEFAULT_CONFIG.walkthrough), "Include the per-file walkthrough table."],
  ["max_comments", "0-100", json(DEFAULT_CONFIG.max_comments), "Most inline comments per review. Extra findings are listed in the review body."],
  ["path_filters", "string[]", "[]", "Globs to include. Prefix with ! to exclude. Built-in exclusions always apply."],
  ["path_instructions", "{ path, instructions }[]", "[]", "Extra review rules for files matching a glob."],
  ["auto_review.enabled", "boolean", json(DEFAULT_CONFIG.auto_review.enabled), "Review automatically when a pull request is opened or updated."],
  ["auto_review.drafts", "boolean", json(DEFAULT_CONFIG.auto_review.drafts), "Also review draft pull requests."],
  ["auto_review.incremental", "boolean", json(DEFAULT_CONFIG.auto_review.incremental), "Review only commits pushed since the last review."],
  ["auto_review.base_branches", "string[]", "[]", "Only review pull requests into matching branches (globs). Empty means all."],
  ["auto_review.ignore_title_keywords", "string[]", json(DEFAULT_CONFIG.auto_review.ignore_title_keywords), "Skip pull requests whose title contains any of these (case-insensitive)."],
  ["auto_review.ignore_authors", "string[]", json(DEFAULT_CONFIG.auto_review.ignore_authors), "Skip pull requests opened by these users."],
];

export default function DocsPage() {
  const { slug, supportEmail, appUrl } = operator();
  return (
    <div className="mx-auto flex max-w-6xl gap-12 px-4 py-16 sm:px-6">
      <aside className="sticky top-24 hidden h-fit w-52 shrink-0 lg:block">
        <p className="mb-3 text-xs font-semibold text-zinc-500 uppercase">On this page</p>
        <nav className="space-y-2 text-sm">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="prose-docs min-w-0 flex-1">
        <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
        <p>Everything you need to install CodeReviewer, tune it for your team, and run it yourself.</p>

        <h2 id="getting-started">Getting started</h2>
        <ol>
          <li>
            <Link href="/login?next=/dashboard">Sign in with GitHub</Link> and choose <strong>Install the GitHub App</strong>.
          </li>
          <li>Pick the account or organization and the repositories CodeReviewer may review.</li>
          <li>Open a pull request. The review appears within a few minutes as a pull request review from the app.</li>
        </ol>
        <p>
          Reviews run automatically for new pull requests and every push. Each enabled repository can be switched off from the
          dashboard without uninstalling the app.
        </p>

        <h2 id="configuration">Configuration</h2>
        <p>
          Add <code>.codereviewer.yaml</code> to the root of your repository (<code>.codereviewer.yml</code> and{" "}
          <code>.github/codereviewer.yaml</code> also work). Every field is optional. The file is read from the pull
          request&apos;s head commit, so you can try a change on a branch before merging it. For pull requests from forks it is
          read from the base branch instead.
        </p>
        <pre>
          <code>{`# .codereviewer.yaml
language: en-US
profile: chill
instructions: |
  We use Result types instead of exceptions in the domain layer.

auto_review:
  drafts: false
  base_branches: ["main", "release/*"]
  ignore_title_keywords: ["WIP", "[skip review]"]

request_changes: false
max_comments: 25

path_filters:
  - "src/**"
  - "!src/**/__generated__/**"

path_instructions:
  - path: "src/api/**"
    instructions: Check authorization before any data access.
  - path: "**/*.test.ts"
    instructions: Only flag tests that cannot fail.`}</code>
        </pre>
        <h3>Editor autocomplete</h3>
        <p>
          With the YAML extension for VS Code (or any editor using yaml-language-server), add this first line to get
          completion and validation as you type:
        </p>
        <pre>
          <code>{`# yaml-language-server: $schema=${appUrl}/schema.json`}</code>
        </pre>
        <h3>Reference</h3>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(([name, type, def, description]) => (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td className="whitespace-nowrap">{type}</td>
                  <td>
                    <code>{def}</code>
                  </td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          If the file has a problem, the review still runs: invalid fields fall back to their defaults and the review body
          lists what was wrong.
        </p>
        <h3>Built-in exclusions</h3>
        <p>These paths are never reviewed because they add noise without reviewable logic:</p>
        <pre>
          <code>{BUILT_IN_EXCLUDES.join("\n")}</code>
        </pre>

        <h2 id="commands">Commands</h2>
        <p>Comment on a pull request to control CodeReviewer. Repository owners, members, collaborators, and the pull request author can use them.</p>
        <table>
          <thead>
            <tr>
              <th>Comment</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>@{slug} review</code>
              </td>
              <td>Review commits pushed since the last review. Works even when automatic reviews are off.</td>
            </tr>
            <tr>
              <td>
                <code>@{slug} full review</code>
              </td>
              <td>Review the entire pull request again.</td>
            </tr>
            <tr>
              <td>
                <code>@{slug} help</code>
              </td>
              <td>Reply with the list of commands.</td>
            </tr>
          </tbody>
        </table>

        <h2 id="how-reviews-work">How reviews work</h2>
        <ul>
          <li>
            The diff for each file is sent to Claude with its new-file line numbers, your instructions, and the pull request
            description. Large pull requests are split into parts and reviewed in parallel.
          </li>
          <li>
            Each finding is checked against the diff before it is posted. Findings that do not point at a changed line are
            listed in the review body instead of being dropped.
          </li>
          <li>
            Suggested fixes appear as GitHub suggestions you can commit with one click. They are only attached when the
            replaced range is valid.
          </li>
          <li>
            A <strong>CodeReviewer</strong> check run shows progress. With <code>request_changes: true</code> it fails on
            critical or major findings, so you can require it in branch protection.
          </li>
          <li>
            Files that are deleted, binary, or too large are listed under <em>Files not reviewed</em>. Nothing is silently
            truncated.
          </li>
          <li>Text in the pull request is treated as untrusted. Attempts to instruct the reviewer are ignored and flagged.</li>
        </ul>

        <h2 id="coderabbit">Migrating from CodeRabbit</h2>
        <p>
          If a repository has no <code>.codereviewer.yaml</code> but has a <code>.coderabbit.yaml</code>, CodeReviewer reads the
          settings that map directly: <code>language</code>, <code>tone_instructions</code>, <code>reviews.profile</code>,{" "}
          <code>reviews.request_changes_workflow</code>, <code>reviews.high_level_summary</code>,{" "}
          <code>reviews.path_filters</code>, <code>reviews.path_instructions</code>, and the <code>reviews.auto_review</code>{" "}
          options. Other fields are ignored. The review body notes which file was used.
        </p>

        <h2 id="billing">Plans and usage</h2>
        <p>
          A plan belongs to a GitHub account or organization and covers all of its repositories. Usage counts completed
          reviews and resets on the first day of each month (UTC). Skipped and failed reviews are free. When the quota is used
          up, CodeReviewer leaves one comment on the pull request explaining why it did not review, and resumes when you
          upgrade or the month resets. See <Link href="/pricing">pricing</Link>.
        </p>

        <h2 id="security">Security and privacy</h2>
        <ul>
          <li>
            <strong>No code storage.</strong> Diffs are fetched from GitHub per review and discarded after the review is posted.
            We store metadata only: pull request number and title, finding counts, the summary, timing, and token counts.
          </li>
          <li>
            <strong>Model provider.</strong> Reviews are generated with the Anthropic API, which by default does not use API
            inputs or outputs to train models.
          </li>
          <li>
            <strong>Least privilege.</strong> The GitHub App asks for pull requests (read and write), contents (read), checks
            (read and write), issues (read, to receive comment commands), and metadata (read).
          </li>
          <li>
            <strong>Verified webhooks.</strong> Every GitHub and Stripe webhook is signature-checked and processed once.
          </li>
          <li>
            <strong>Sessions.</strong> GitHub sign-in uses OAuth with a state check. Session tokens are random, stored only as
            hashes, and sent in HTTP-only cookies.
          </li>
        </ul>
        <p>
          Report a vulnerability to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>

        <h2 id="self-hosting">Self-hosting</h2>
        <p>
          CodeReviewer ships as one Docker image with a web process and a worker, backed by PostgreSQL. Billing is optional:
          without Stripe variables every account has unlimited reviews. The repository&apos;s <code>docs/deployment.md</code>{" "}
          walks through creating the GitHub App, setting environment variables, and deploying with Docker Compose, Render, Fly.io,
          or any container host.
        </p>
        <pre>
          <code>{`cp .env.example .env      # fill in GitHub App and Anthropic credentials
docker compose up -d      # postgres, migrations, web, worker`}</code>
        </pre>
      </article>
    </div>
  );
}
