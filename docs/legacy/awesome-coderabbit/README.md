# Awesome CodeRabbit [![Awesome](https://awesome.re/badge-flat.svg)](https://awesome.re)

> A curated, well-organized list of CodeRabbit resources — docs, API reference, starter configurations, integration guides, videos, blogs, and open source projects using it.

**CodeRabbit** is an AI code review platform. It attaches to a pull request, clones the repository into a sandbox, runs 50+ static analyzers alongside agentic exploration of the codebase, and posts a structured walkthrough plus line-level review comments. It also runs in your IDE, on the command line, in Slack and Discord, and as an autonomous agent that plans and opens pull requests. It supports GitHub, GitLab, Azure DevOps, and Bitbucket.

This list is maintained as a small documentation project with its own architecture, workflow, and validation rules — see [Repository documentation](#repository-documentation) if you want to build, fork, or extend it.

---

## Contents

- [Quick start](#quick-start)
- [Official resources](#official-resources)
- [Getting started](#getting-started)
- [Documentation](#documentation)
- [API reference](#api-reference)
- [Configuration examples](#configuration-examples)
- [Review commands](#review-commands)
- [Integration guides](#integration-guides)
- [Videos](#videos)
- [Blogs](#blogs)
- [Media coverage](#media-coverage)
- [Community reviews](#community-reviews)
- [Projects using CodeRabbit](#projects-using-coderabbit)
- [Repository documentation](#repository-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Quick start

1. Install the CodeRabbit app on your Git provider and grant it access to one repository.
2. Open a pull request. CodeRabbit posts a walkthrough comment and inline review comments.
3. Reply to any comment in plain language, or run `@coderabbitai help` to see the commands.
4. Commit a `.coderabbit.yaml` to the repository root to make behavior explicit and version-controlled.
5. Copy a starter file from [`configs/`](configs/) that matches your stack, then tune it.

A minimal, safe starting point:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: "en-US"

reviews:
  profile: "chill"
  high_level_summary: true
  path_filters:
    - "!**/*.lock"
    - "!**/dist/**"
    - "!**/node_modules/**"
  auto_review:
    enabled: true
    drafts: false

chat:
  auto_reply: true
```

Already have settings in the web UI? Comment `@coderabbitai configuration` on any pull request to get the resolved configuration as YAML, or `@coderabbitai generate configuration` to have CodeRabbit open a pull request that adds the file for you.

---

## Official resources

- [CodeRabbit](https://www.coderabbit.ai) — Product site, plans, and sign-up.
- [Documentation](https://docs.coderabbit.ai) — The authoritative reference for every feature.
- [Configuration reference](https://docs.coderabbit.ai/reference/configuration) — Every `.coderabbit.yaml` field, with defaults.
- [JSON Schema (v2)](https://coderabbit.ai/integrations/schema.v2.json) — Machine-readable schema for editor autocomplete and validation.
- [Changelog](https://docs.coderabbit.ai/changelog) — What shipped, in reverse-chronological order.
- [Blog](https://www.coderabbit.ai/blog) — Release notes, engineering posts, and how-tos.
- [FAQ](https://www.coderabbit.ai/faq) — Common questions on plans, privacy, and behavior.
- [Pricing](https://www.coderabbit.ai/pricing) — Free, Essentials, Team, Advanced, and Enterprise tiers.
- [Open source program](https://www.coderabbit.ai/oss) — Free access for OSS maintainers, and the sponsorship commitment behind it.
- [Startup program](https://www.coderabbit.ai/startup-program) — Discounted access for early-stage teams.
- [Enterprise](https://www.coderabbit.ai/enterprise) — Self-hosting, multi-org, and procurement questions.
- [Security](https://www.coderabbit.ai/security) — How code is handled, and what is never used for training.
- [Trust Center](https://trust.coderabbit.ai/) — SOC 2 posture, subprocessors, and data-handling commitments.
- [System status](https://status.coderabbit.ai) — Check here before debugging a review that never arrived.
- [Case studies](https://www.coderabbit.ai/customers) — Named teams describing measured outcomes.
- [Reports and guides](https://www.coderabbit.ai/whitepapers) — Longer-form research and adoption playbooks.
- [Newsroom](https://www.coderabbit.ai/newsroom) — Announcements and press material.
- [`llms.txt`](https://docs.coderabbit.ai/llms.txt) — Full documentation index, designed for AI agents to crawl.
- [Official awesome-coderabbit](https://github.com/coderabbitai/awesome-coderabbit) — The vendor-maintained list this one complements.
- [GitHub organization](https://github.com/coderabbitai) — Public repositories, including the original AI PR reviewer.
- [Discord](https://discord.gg/coderabbit) — Community support, and where the Discord agent is demonstrated.
- [YouTube](https://www.youtube.com/@CodeRabbitAI) — Official demos, tutorials, and feature walkthroughs.
- [X / Twitter](https://x.com/coderabbitai) — Release announcements and short demos.
- [Bluesky](https://bsky.app/profile/coderabbitai.bsky.social) — The same announcements, elsewhere.
- [LinkedIn](https://www.linkedin.com/company/coderabbitai/) — Company updates and hiring.
- [Support](https://www.coderabbit.ai/contact-us/support) — Help desk for account and billing questions.
- [Vulnerability disclosure](https://www.coderabbit.ai/vulnerability-disclosure) — Where to report a security issue responsibly.

---

## Getting started

- [Quickstart](https://docs.coderabbit.ai/getting-started/quickstart) — Install, authorize, and get your first review in minutes.
- [Platform overview](https://docs.coderabbit.ai/platforms/overview) — Which features exist on GitHub, GitLab, Azure DevOps, and Bitbucket.
- [Code review overview](https://docs.coderabbit.ai/guides/code-review-overview) — What CodeRabbit looks for and how findings are ranked.
- [How CodeRabbit works](https://docs.coderabbit.ai/overview/architecture) — Sandboxed execution, analyzer fan-out, and the parallel agents behind each comment.
- [YAML configuration](https://docs.coderabbit.ai/getting-started/yaml-configuration) — Where the file lives and how precedence works.
- [Glossary](https://docs.coderabbit.ai/reference/glossary) — Walkthrough, Learnings, Finishing Touches, Change Stack, and other terms.
- [Configuration examples](https://docs.coderabbit.ai/configuration/example) — Official framework-specific starters (Django, Expo, Mintlify).
- [YAML validator](https://docs.coderabbit.ai/configuration/yaml-validator) — Check a config before committing it.

---

## Documentation

A grouped map of the official docs. Sections are collapsed so the page stays browsable — click to expand.

### Core

| Page | What it covers |
| --- | --- |
| [Docs home](https://docs.coderabbit.ai) | Entry point and navigation. |
| [Pull request review](https://docs.coderabbit.ai/overview/pull-request-review) | The end-to-end review lifecycle on a PR. |
| [IDE & CLI review](https://docs.coderabbit.ai/overview/ide-cli-review) | Reviewing before you push, locally. |
| [Architecture](https://docs.coderabbit.ai/overview/architecture) | The system behind each review comment. |
| [Glossary](https://docs.coderabbit.ai/reference/glossary) | Definitions for CodeRabbit-specific terms. |
| [FAQ](https://docs.coderabbit.ai/faq) | Behavior, limits, and troubleshooting. |

<details>
<summary><b>Pull request reviews</b> — summaries, walkthroughs, gates, and merge policy</summary>

| Page | What it covers |
| --- | --- |
| [Summaries](https://docs.coderabbit.ai/pr-reviews/summaries) | High-level PR summaries and release-note style output. |
| [Walkthroughs](https://docs.coderabbit.ai/pr-reviews/walkthroughs) | The structured top-of-PR comment: changes, diagrams, effort estimate. |
| [Pre-merge checks](https://docs.coderabbit.ai/pr-reviews/pre-merge-checks) | Title, description, docstring-coverage, and linked-issue gates. |
| [Custom checks](https://docs.coderabbit.ai/pr-reviews/custom-checks) | Your own deterministic pass/fail policies. |
| [Post-merge actions](https://docs.coderabbit.ai/pr-reviews/post-merge-actions) | Prompt-driven follow-up work after a merge. |
| [Request-changes workflow](https://docs.coderabbit.ai/pr-reviews/request-changes-workflow) | Treat CodeRabbit as a blocking reviewer that auto-approves when clean. |
| [Slop detection](https://docs.coderabbit.ai/pr-reviews/slop-detection) | Flagging low-quality or spam pull requests. |
| [CI/CD pipeline analysis](https://docs.coderabbit.ai/pr-reviews/cicd-pipeline-analysis) | Reading failing pipelines as review context. |
| [Review commands](https://docs.coderabbit.ai/reference/review-commands) | Every `@coderabbitai` command, with usage notes. |
| [Caching](https://docs.coderabbit.ai/reference/caching) | What gets cached between runs, and how to disable it. |

</details>

<details>
<summary><b>Change Stack</b> — layer-by-layer diff review</summary>

| Page | What it covers |
| --- | --- |
| [Overview](https://docs.coderabbit.ai/change-stack) | Reorganizing a flat file list into structured layers. |
| [Navigation](https://docs.coderabbit.ai/change-stack/navigation) | Moving through a stack. |
| [Reading diffs](https://docs.coderabbit.ai/change-stack/reading-diffs) | Range-specific summaries and diagrams. |
| [Reviewing](https://docs.coderabbit.ai/change-stack/reviewing) | Leaving feedback inside a stack. |
| [Findings](https://docs.coderabbit.ai/change-stack/findings) | How findings are grouped and surfaced. |
| [Chat](https://docs.coderabbit.ai/change-stack/chat) | Asking questions in context. |
| [Snapshots](https://docs.coderabbit.ai/change-stack/snapshots) | Point-in-time views of a change. |
| [Notifications](https://docs.coderabbit.ai/change-stack/notifications) | Staying informed without noise. |
| [Provider support](https://docs.coderabbit.ai/change-stack/provider-support) | Availability per Git platform. |

</details>

<details>
<summary><b>Finishing Touches</b> — agentic actions after the review</summary>

| Page | What it covers |
| --- | --- |
| [Overview](https://docs.coderabbit.ai/finishing-touches) | The checkbox/command surface for post-review actions. |
| [Autofix](https://docs.coderabbit.ai/finishing-touches/autofix) | Apply fixes for unresolved findings, directly or as a stacked PR. |
| [Fix CI](https://docs.coderabbit.ai/finishing-touches/fix-ci) | Investigate failing checks and commit a fix. |
| [Docstrings](https://docs.coderabbit.ai/finishing-touches/docstrings) | Generate missing docstrings. |
| [Unit tests](https://docs.coderabbit.ai/finishing-touches/unit-test-generation) | Scaffold tests for changed code. |
| [Simplify](https://docs.coderabbit.ai/finishing-touches/simplify) | Propose lower-complexity rewrites. |
| [Resolve merge conflict](https://docs.coderabbit.ai/finishing-touches/resolve-merge-conflict) | Unblock a conflicted branch. |
| [Custom finishing touches](https://docs.coderabbit.ai/finishing-touches/custom-finishing-touches) | Define your own named actions. |

</details>

<details>
<summary><b>Configuration</b> — YAML, path instructions, inheritance</summary>

| Page | What it covers |
| --- | --- |
| [Configuration overview](https://docs.coderabbit.ai/guides/configuration-overview) | The layers: repo YAML, central YAML, UI, defaults. |
| [YAML configuration](https://docs.coderabbit.ai/getting-started/yaml-configuration) | File location, precedence, and branch behavior. |
| [Full reference](https://docs.coderabbit.ai/reference/configuration) | Every field, type, enum, and default. |
| [Path instructions](https://docs.coderabbit.ai/configuration/path-instructions) | Glob-scoped review rules. |
| [Auto review](https://docs.coderabbit.ai/configuration/auto-review) | Triggers, labels, base branches, and pausing. |
| [ast-grep instructions](https://docs.coderabbit.ai/configuration/ast-grep-instructions) | Structural, AST-based custom rules. |
| [Central configuration](https://docs.coderabbit.ai/configuration/central-configuration) | One config shared across many repositories. |
| [Configuration inheritance](https://docs.coderabbit.ai/configuration/configuration-inheritance) | Merging values across levels instead of overriding. |
| [YAML validator](https://docs.coderabbit.ai/configuration/yaml-validator) | Validate before you commit. |
| [Examples](https://docs.coderabbit.ai/configuration/example) | Official Django, Expo, and Mintlify starters. |
| [Early access](https://docs.coderabbit.ai/early-access) | Opting into unreleased features. |

</details>

<details>
<summary><b>Knowledge base</b> — the context behind good reviews</summary>

| Page | What it covers |
| --- | --- |
| [Overview](https://docs.coderabbit.ai/knowledge-base) | All context sources, in one place. |
| [Code guidelines](https://docs.coderabbit.ai/knowledge-base/code-guidelines) | Reuse `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, and friends as review criteria. |
| [Learnings](https://docs.coderabbit.ai/knowledge-base/learnings) | Preferences learned from chat, with optional admin approval. |
| [MCP context](https://docs.coderabbit.ai/knowledge-base/mcp-context) | Pulling context from connected MCP servers. |
| [Multi-repo analysis](https://docs.coderabbit.ai/knowledge-base/multi-repo-analysis) | Cross-repository awareness. |
| [Web search](https://docs.coderabbit.ai/knowledge-base/web-search) | When CodeRabbit looks things up. |

</details>

<details>
<summary><b>IDE and CLI</b> — review before you push</summary>

| Page | What it covers |
| --- | --- |
| [VS Code extension](https://docs.coderabbit.ai/ide) | Overview of the editor experience. |
| [Install](https://docs.coderabbit.ai/ide/vscode-install) · [Use](https://docs.coderabbit.ai/ide/vscode-use) · [Configure](https://docs.coderabbit.ai/ide/vscode-config) | Day-to-day extension workflow. |
| [Plan in the IDE](https://docs.coderabbit.ai/ide/vscode-plan) | Generate a coding plan from the editor. |
| [Self-hosted IDE setup](https://docs.coderabbit.ai/ide/vscode-selfhosted) · [Uninstall](https://docs.coderabbit.ai/ide/vscode-uninstall) | Enterprise and cleanup paths. |
| [CLI](https://docs.coderabbit.ai/cli) | Local reviews from the terminal. |
| [CLI reference](https://docs.coderabbit.ai/cli/reference) | Commands, flags, and exit codes. |
| [CLI skills](https://docs.coderabbit.ai/cli/skills) | Extending the CLI with skills. |
| [Headless mode](https://docs.coderabbit.ai/cli/headless-cli-integration) | Wiring the CLI into scripts and pipelines. |
| [Claude Code](https://docs.coderabbit.ai/cli/claude-code-integration) · [Codex](https://docs.coderabbit.ai/cli/codex-integration) · [Cursor](https://docs.coderabbit.ai/cli/cursor-integration) · [Gemini](https://docs.coderabbit.ai/cli/gemini-integration) | Reviewing the output of coding agents. |
| [Windows](https://docs.coderabbit.ai/cli/windows) · [Network requirements](https://docs.coderabbit.ai/cli/network-requirements) · [Jamf-managed macOS](https://docs.coderabbit.ai/cli/jamf-managed-macos) | Platform and fleet notes. |
| [CLI with self-hosted](https://docs.coderabbit.ai/cli/cli-with-self-hosted-CodeRabbit) | Pointing the CLI at your own deployment. |
| [IDE & CLI metrics](https://docs.coderabbit.ai/guides/ide-cli-dashboard-metrics) | What local reviews report to the dashboard. |

</details>

<details>
<summary><b>Agent, plans, and issues</b> — from ticket to pull request</summary>

| Page | What it covers |
| --- | --- |
| [Agent](https://docs.coderabbit.ai/agent) | The autonomous agent that investigates and implements. |
| [Agent skills](https://docs.coderabbit.ai/agent/skills) | Extending agent capabilities. |
| [Coding plans](https://docs.coderabbit.ai/plan) | Codebase-aware implementation plans. |
| [Create a plan](https://docs.coderabbit.ai/plan/create-plan) · [Refine](https://docs.coderabbit.ai/plan/plan-refinement) · [Hand off](https://docs.coderabbit.ai/plan/agent-handoff) | The plan lifecycle. |
| [CodeRabbit Plan overview](https://docs.coderabbit.ai/overview/coderabbit-plan) | Where planning fits in the product. |
| [Issue creation](https://docs.coderabbit.ai/issues/creation) · [Enrichment](https://docs.coderabbit.ai/issues/enrichment) | Turning rough reports into actionable issues. |
| [PR validation against issues](https://docs.coderabbit.ai/issues/pr-validation) | Does this PR actually solve the ticket? |
| [Planner](https://docs.coderabbit.ai/issues/planner) — [GitHub](https://docs.coderabbit.ai/issues/planner/github) · [GitLab](https://docs.coderabbit.ai/issues/planner/gitlab) · [Azure DevOps](https://docs.coderabbit.ai/issues/planner/azure-devops) · [Jira](https://docs.coderabbit.ai/issues/planner/jira) · [Linear](https://docs.coderabbit.ai/issues/planner/linear) | Planning from your tracker of choice. |

</details>

<details>
<summary><b>Triage</b> — working the findings queue</summary>

| Page | What it covers |
| --- | --- |
| [Overview](https://docs.coderabbit.ai/triage) | The triage surface for findings across repos. |
| [Cards](https://docs.coderabbit.ai/triage/cards) · [Actions](https://docs.coderabbit.ai/triage/actions) | Reading and acting on a finding. |
| [Prioritization](https://docs.coderabbit.ai/triage/prioritization) | How the queue is ordered. |
| [Views and filters](https://docs.coderabbit.ai/triage/views-and-filters) | Slicing the queue for your team. |
| [Slack triage](https://docs.coderabbit.ai/triage/slack) | Triaging without leaving chat. |
| [Troubleshooting](https://docs.coderabbit.ai/triage/troubleshooting) | When findings look wrong or missing. |

</details>

<details>
<summary><b>Slack and Discord agents</b></summary>

| Page | What it covers |
| --- | --- |
| [Slack agent overview](https://docs.coderabbit.ai/overview/slack-agent) · [Docs](https://docs.coderabbit.ai/slack-agent) | Investigate, plan, and open PRs from a thread. |
| [Onboarding](https://docs.coderabbit.ai/slack-agent/onboarding) · [Use in Slack](https://docs.coderabbit.ai/slack-agent/use-in-slack) · [Usage](https://docs.coderabbit.ai/slack-agent/usage) | Setup and daily use. |
| [Automations](https://docs.coderabbit.ai/slack-agent/automations) · [Thread reviews](https://docs.coderabbit.ai/slack-agent/thread-reviews) | Recurring and reactive work. |
| [Connections and scopes](https://docs.coderabbit.ai/slack-agent/connections-and-scopes) · [Permissions](https://docs.coderabbit.ai/slack-agent/slack-permissions) · [Admin and security](https://docs.coderabbit.ai/slack-agent/admin-and-security) | Controlling what the agent can reach. |
| [Knowledge base](https://docs.coderabbit.ai/slack-agent/knowledge-base) · [Sandboxes](https://docs.coderabbit.ai/slack-agent/sandboxes) · [Plans](https://docs.coderabbit.ai/slack-agent/plans) | Context, isolation, and availability. |
| [Discord agent](https://docs.coderabbit.ai/discord-agent) — [Setup](https://docs.coderabbit.ai/discord-agent/setup) · [Automations](https://docs.coderabbit.ai/discord-agent/automations) · [Connections](https://docs.coderabbit.ai/discord-agent/connections-and-scopes) · [Usage and limits](https://docs.coderabbit.ai/discord-agent/usage-and-limits) | For open source communities. |

</details>

<details>
<summary><b>Connections and platforms</b></summary>

| Page | What it covers |
| --- | --- |
| [Connections](https://docs.coderabbit.ai/connections) | The integration catalog. |
| [Issue trackers](https://docs.coderabbit.ai/connections/issue-trackers) · [Jira](https://docs.coderabbit.ai/connections/jira) · [Linear](https://docs.coderabbit.ai/connections/linear) | Linking work items to code. |
| [MCP servers](https://docs.coderabbit.ai/connections/mcp-servers) | Bringing external context in via MCP. |
| [CircleCI](https://docs.coderabbit.ai/connections/circleci) · [Jenkins](https://docs.coderabbit.ai/connections/jenkins) | CI signal as review context. |
| [Scopes](https://docs.coderabbit.ai/connections/scopes) · [Scopes review](https://docs.coderabbit.ai/connections/scopes-review) | Least-privilege access boundaries. |
| [Platform overview](https://docs.coderabbit.ai/platforms/overview) | Feature parity matrix. |
| [GitHub.com](https://docs.coderabbit.ai/platforms/github-com) · [GitHub Enterprise Server](https://docs.coderabbit.ai/platforms/github-enterprise-server) | GitHub setup paths. |
| [GitLab.com](https://docs.coderabbit.ai/platforms/gitlab-com) · [Self-hosted GitLab](https://docs.coderabbit.ai/platforms/self-hosted-gitlab) | GitLab setup paths. |
| [Azure DevOps](https://docs.coderabbit.ai/platforms/azure-devops) | Azure Repos setup. |
| [Bitbucket Cloud](https://docs.coderabbit.ai/platforms/bitbucket-cloud) · [Bitbucket Data Center](https://docs.coderabbit.ai/platforms/bitbucket-data-center) | Bitbucket setup paths. |

</details>

<details>
<summary><b>Static analysis tools</b> — 60+ built-in analyzers</summary>

Start here:

- [Tools overview](https://docs.coderabbit.ai/tools) — How analyzers are selected and run.
- [Supported tools list](https://docs.coderabbit.ai/tools/list) — The complete catalog.
- [Tools configuration reference](https://docs.coderabbit.ai/tools/reference) — Enabling, disabling, and pointing at config files.

Frequently configured, by ecosystem:

| Ecosystem | Analyzers |
| --- | --- |
| JavaScript / TypeScript | [ESLint](https://docs.coderabbit.ai/tools/eslint), [Biome](https://docs.coderabbit.ai/tools/biome), [Oxlint](https://docs.coderabbit.ai/tools/oxlint), [React Doctor](https://docs.coderabbit.ai/tools/react-doctor), [Stylelint](https://docs.coderabbit.ai/tools/stylelint), [HTMLHint](https://docs.coderabbit.ai/tools/htmlhint) |
| Python | [Ruff](https://docs.coderabbit.ai/tools/ruff), [Flake8](https://docs.coderabbit.ai/tools/flake8), [Pylint](https://docs.coderabbit.ai/tools/pylint) |
| Go | [golangci-lint](https://docs.coderabbit.ai/tools/golangci-lint), [Buf](https://docs.coderabbit.ai/tools/buf) |
| Rust / C / C++ | [Clippy](https://docs.coderabbit.ai/tools/clippy), [clang-tidy](https://docs.coderabbit.ai/tools/clang-tidy), [Cppcheck](https://docs.coderabbit.ai/tools/cppcheck) |
| JVM / mobile | [Detekt](https://docs.coderabbit.ai/tools/detekt), [PMD](https://docs.coderabbit.ai/tools/pmd), [SwiftLint](https://docs.coderabbit.ai/tools/swiftlint), [FBInfer](https://docs.coderabbit.ai/tools/fbinfer) |
| PHP / Ruby | [PHPStan](https://docs.coderabbit.ai/tools/phpstan), [PHPCS](https://docs.coderabbit.ai/tools/phpcs), [PHPMD](https://docs.coderabbit.ai/tools/phpmd), [RuboCop](https://docs.coderabbit.ai/tools/rubocop), [Brakeman](https://docs.coderabbit.ai/tools/brakeman) |
| Security / secrets | [Semgrep](https://docs.coderabbit.ai/tools/semgrep), [Opengrep](https://docs.coderabbit.ai/tools/opengrep), [Betterleaks](https://docs.coderabbit.ai/tools/betterleaks) (configured under the `gitleaks` key), [TruffleHog](https://docs.coderabbit.ai/tools/trufflehog), [Trivy](https://docs.coderabbit.ai/tools/trivy), [OSV-Scanner](https://docs.coderabbit.ai/tools/osv-scanner), [Presidio](https://docs.coderabbit.ai/tools/presidio) |
| Infrastructure / CI | [Checkov](https://docs.coderabbit.ai/tools/checkov), [TFLint](https://docs.coderabbit.ai/tools/tflint), [Hadolint](https://docs.coderabbit.ai/tools/hadolint), [actionlint](https://docs.coderabbit.ai/tools/actionlint), [zizmor](https://docs.coderabbit.ai/tools/zizmor), [CircleCI](https://docs.coderabbit.ai/tools/circleci), [GitHub Checks](https://docs.coderabbit.ai/tools/github-checks), [checkmake](https://docs.coderabbit.ai/tools/checkmake) |
| Data / API / SQL | [SQLFluff](https://docs.coderabbit.ai/tools/sqlfluff), [Squawk](https://docs.coderabbit.ai/tools/squawk), [Prisma Lint](https://docs.coderabbit.ai/tools/prisma-lint), [oasdiff](https://docs.coderabbit.ai/tools/oasdiff) |
| Shell / config / prose | [ShellCheck](https://docs.coderabbit.ai/tools/shellcheck), [PSScriptAnalyzer](https://docs.coderabbit.ai/tools/psscriptanalyzer), [yamllint](https://docs.coderabbit.ai/tools/yamllint), [dotenv-linter](https://docs.coderabbit.ai/tools/dotenv), [markdownlint](https://docs.coderabbit.ai/tools/markdownlint), [LanguageTool](https://docs.coderabbit.ai/tools/languagetool), [Vale](https://docs.coderabbit.ai/tools/vale) |
| Structural rules | [ast-grep](https://docs.coderabbit.ai/tools/ast-grep) — write custom AST patterns as review rules. |

</details>

<details>
<summary><b>Dashboards, reports, and administration</b></summary>

| Page | What it covers |
| --- | --- |
| [Dashboard](https://docs.coderabbit.ai/guides/dashboard) · [Metrics](https://docs.coderabbit.ai/guides/dashboard-metrics) | Review throughput and quality signals. |
| [Custom reports](https://docs.coderabbit.ai/guides/custom-reports) · [Scheduled](https://docs.coderabbit.ai/guides/scheduled-reports) · [On-demand](https://docs.coderabbit.ai/guides/ondemand-reports) | Prompt-templated reporting. |
| [Data export](https://docs.coderabbit.ai/guides/data-export) · [Reports](https://docs.coderabbit.ai/management/reports) · [Review usage](https://docs.coderabbit.ai/management/review-usage-dashboard) | Getting data out. |
| [Management overview](https://docs.coderabbit.ai/management) | Admin surface map. |
| [Organization settings](https://docs.coderabbit.ai/guides/organization-settings) · [Repository settings](https://docs.coderabbit.ai/guides/repository-settings) | UI configuration layers. |
| [Plans](https://docs.coderabbit.ai/management/plans) · [Billing](https://docs.coderabbit.ai/management/billing) · [Subscriptions](https://docs.coderabbit.ai/management/subscription-management) · [Usage add-on](https://docs.coderabbit.ai/management/usage-based-addon) | Commercial administration. |
| [Seat assignment](https://docs.coderabbit.ai/management/seat-assignment) · [Roles](https://docs.coderabbit.ai/management/roles) · [Custom roles](https://docs.coderabbit.ai/management/custom-roles) · [Upgrading permissions](https://docs.coderabbit.ai/management/upgrading-permissions) | Access control. |
| [Multi-org](https://docs.coderabbit.ai/management/multi-org) · [Adding organizations](https://docs.coderabbit.ai/management/adding-organizations) | Scaling across org boundaries. |
| [Audit logs](https://docs.coderabbit.ai/management/audit-logs) · [Rate limits](https://docs.coderabbit.ai/management/rate-limits) | Compliance and quotas. |

</details>

<details>
<summary><b>Security and self-hosting</b></summary>

| Page | What it covers |
| --- | --- |
| [Security](https://docs.coderabbit.ai/security) | Data handling, retention, and model usage. |
| [Architecture review](https://docs.coderabbit.ai/security/architecture-review) | Reviewing design-level risk, not just diffs. |
| [Attack surface](https://docs.coderabbit.ai/security/attack-surface) | What a change exposes. |
| [Blast radius](https://docs.coderabbit.ai/security/blast-radius) | How far a change can propagate. |
| [Self-hosted overview](https://docs.coderabbit.ai/self-hosted/overview) | Running CodeRabbit in your own environment. |
| [Reverse tunnel](https://docs.coderabbit.ai/self-hosted/coderabbit-reverse-tunnel) · [Connector configuration](https://docs.coderabbit.ai/self-hosted/reverse-tunnel-connector-configuration) | Reaching private Git hosts. |

</details>

---

## API reference

The REST API covers organizations, users, roles, metrics, learnings, security scans, and report generation. Start with [API overview](https://docs.coderabbit.ai/api) and [workspace API tokens](https://docs.coderabbit.ai/api/workspace-api-tokens) for authentication.

| Area | Endpoints |
| --- | --- |
| Organizations | [List organizations](https://docs.coderabbit.ai/api-reference/organizations-list) · [List org repositories](https://docs.coderabbit.ai/api-reference/organization-repositories-list) |
| Users and seats | [List users](https://docs.coderabbit.ai/api-reference/users-list) · [Change roles](https://docs.coderabbit.ai/api-reference/users-change-roles) · [Manage seats](https://docs.coderabbit.ai/api-reference/users-manage-seats) · [Seat assignment mode](https://docs.coderabbit.ai/api-reference/users-seat-assignment-mode) |
| Roles and permissions | [Create](https://docs.coderabbit.ai/api-reference/roles-create) · [Get](https://docs.coderabbit.ai/api-reference/roles-get) · [List](https://docs.coderabbit.ai/api-reference/roles-list) · [Update](https://docs.coderabbit.ai/api-reference/roles-update) · [Delete](https://docs.coderabbit.ai/api-reference/roles-delete) · [Permissions](https://docs.coderabbit.ai/api-reference/roles-permissions) |
| Metrics | [Metrics data API](https://docs.coderabbit.ai/api-reference/metrics-data-api) · [Review comment metrics](https://docs.coderabbit.ai/api-reference/review-comment-metrics) · [MCP metrics](https://docs.coderabbit.ai/api-reference/mcp-metrics) |
| Learnings | [List](https://docs.coderabbit.ai/api-reference/learnings-list) · [Update](https://docs.coderabbit.ai/api-reference/learnings-update) · [Delete](https://docs.coderabbit.ai/api-reference/learnings-delete) |
| Reports and audit | [Generate report](https://docs.coderabbit.ai/api-reference/report-generate) · [Audit logs](https://docs.coderabbit.ai/api-reference/audit-logs) |
| Security | [List code security scans](https://docs.coderabbit.ai/api-reference/security-scans-code-list) |

---

## Configuration examples

Ready-to-copy `.coderabbit.yaml` starters live in [`configs/`](configs/). Each one is commented, validated against [`schema/coderabbit.config.schema.json`](schema/coderabbit.config.schema.json), and deliberately conservative — you should be able to commit it and immediately get quieter, more relevant reviews.

| Stack | File | Focus |
| --- | --- | --- |
| JavaScript | [`configs/javascript/.coderabbit.yaml`](configs/javascript/.coderabbit.yaml) | Node and browser code, ESLint/Biome, ignoring build output and lockfiles. |
| TypeScript | [`configs/typescript/.coderabbit.yaml`](configs/typescript/.coderabbit.yaml) | Type-safety rules, React patterns, generated `.d.ts` exclusions. |
| Python | [`configs/python/.coderabbit.yaml`](configs/python/.coderabbit.yaml) | Ruff and Flake8, docstring coverage, migrations and notebooks. |
| Go | [`configs/go/.coderabbit.yaml`](configs/go/.coderabbit.yaml) | golangci-lint, error wrapping, concurrency, generated protobuf files. |
| Mixed stack | [`configs/mixed-stack/.coderabbit.yaml`](configs/mixed-stack/.coderabbit.yaml) | Monorepo with several languages plus Terraform, Docker, and workflows. |
| Minimal | [`configs/minimal/.coderabbit.yaml`](configs/minimal/.coderabbit.yaml) | The smallest sensible starting point, roughly 20 lines. |

Read [`docs/configuration-guide.md`](docs/configuration-guide.md) for the field-by-field walkthrough, how the layers merge, and how to validate a file locally or in CI.

Official framework starters worth copying too:

- [React Native + Expo](https://docs.coderabbit.ai/configuration/example/typescript/expo) — Mobile performance and accessibility guidance.
- [Python + Django](https://docs.coderabbit.ai/configuration/example/python/django) — Queryset performance, `full_clean()` before `save()`, docstring rules.
- [Mintlify docs sites](https://docs.coderabbit.ai/configuration/example/other/mintlify-documentation) — MDX validation and navigation consistency.
- [Pre-merge check packs](https://github.com/coderabbitai/awesome-coderabbit/blob/main/configs/pre-mergechecks/README.md) — Copyable policy examples for SaaS, fintech, and health tech.

---

## Review commands

The commands you will actually use, day to day. Full list in the [review commands reference](https://docs.coderabbit.ai/reference/review-commands).

| Command | Where | What it does |
| --- | --- | --- |
| `@coderabbitai review` | PR comment | Incremental review of new changes only. |
| `@coderabbitai full review` | PR comment | Fresh pass over the entire pull request. |
| `@coderabbitai pause` / `resume` | PR comment | Stop and restart automatic reviews while you iterate. |
| `@coderabbitai ignore` | PR description | Permanently skip reviews for this PR. |
| `@coderabbitai summary` | PR description | Placeholder that gets replaced by the generated summary. |
| `@coderabbitai autofix` | PR or thread reply | Apply fixes for unresolved findings; add `stacked pr` for a separate branch. |
| `@coderabbitai fix-ci` | PR comment | Investigate failing CI and commit a fix. |
| `@coderabbitai generate docstrings` / `unit tests` | PR comment | Fill documentation or test gaps. |
| `@coderabbitai resolve` / `approve` | Top-level PR comment | Resolve CodeRabbit threads, and approve when the request-changes workflow is on. |
| `@coderabbitai configuration` | PR comment | Print the resolved config, annotated with where each value came from. |
| `@coderabbitai emit path instructions` | PR comment | Open a PR that adds suggested path instructions to your YAML. |
| `@coderabbitai rate limit` | PR comment | Check remaining review allowance without spending one. |
| `@coderabbitai help` | PR comment | Quick reference, in the PR. |

---

## Integration guides

- [GitHub.com setup](https://docs.coderabbit.ai/platforms/github-com) — App installation, permissions, and required checks.
- [GitLab setup](https://docs.coderabbit.ai/platforms/gitlab-com) — Including [self-hosted GitLab](https://docs.coderabbit.ai/platforms/self-hosted-gitlab).
- [Azure DevOps setup](https://docs.coderabbit.ai/platforms/azure-devops) — End-to-end walkthrough for Azure Repos.
- [Bitbucket setup](https://docs.coderabbit.ai/platforms/bitbucket-cloud) — Cloud, plus [Data Center](https://docs.coderabbit.ai/platforms/bitbucket-data-center).
- [Jira](https://docs.coderabbit.ai/connections/jira) and [Linear](https://docs.coderabbit.ai/connections/linear) — Close the loop between tickets and diffs.
- [Issue trackers overview](https://docs.coderabbit.ai/connections/issue-trackers) — Which trackers connect, and what context they contribute.
- [MCP servers as review context](https://docs.coderabbit.ai/connections/mcp-servers) — Feed internal systems into reviews over MCP.
- [Jenkins](https://docs.coderabbit.ai/connections/jenkins) and [CircleCI](https://docs.coderabbit.ai/connections/circleci) — Wire build results in as review context.
- [CI/CD pipeline analysis](https://docs.coderabbit.ai/pr-reviews/cicd-pipeline-analysis) — Let a failing pipeline inform the review.
- [Headless CLI in a pipeline](https://docs.coderabbit.ai/cli/headless-cli-integration) — Non-interactive reviews for scripts and runners.
- [Claude Code integration](https://docs.coderabbit.ai/cli/claude-code-integration) — Review agent-authored changes before they leave your machine.
- [Cursor plugin](https://www.coderabbit.ai/blog/coderabbit-plugin-for-cursor) — Run reviews from the same Agent session where you build.
- [Central configuration](https://docs.coderabbit.ai/configuration/central-configuration) — One config across many repositories.
- [Self-hosted reverse tunnel](https://docs.coderabbit.ai/self-hosted/coderabbit-reverse-tunnel) — Connect a private Git host without inbound firewall rules.
- [Connection scopes](https://docs.coderabbit.ai/connections/scopes) — Least-privilege boundaries for what an agent can reach.

---

## Videos

- [Official channel](https://www.youtube.com/@CodeRabbitAI) — Demos, feature launches, and office hours.
- [Getting started tutorial](https://www.youtube.com/watch?v=3SyUOSebG7E) — Official step-by-step for new users.
- [Cut review time and bugs](https://www.youtube.com/watch?v=vuAC3eNvUmc) — The pitch, with a live pull request.
- [AI code reviews in GitHub: setup + demo](https://www.youtube.com/watch?v=517GZOizEIc) — Community walkthrough from install to first review.
- [AI code reviews that actually work](https://www.youtube.com/watch?v=gR1HmrfcaIo) — Community tutorial on tuning the reviewer.
- [Demo with use cases](https://www.youtube.com/watch?v=69Hh3f0v0Bs) — Several realistic review scenarios.
- [Reviews for Cursor, Claude Code, and Copilot output](https://www.youtube.com/watch?v=mWINqZymw4U) — Using CodeRabbit as a check on coding agents.
- [Hands-on: deploying a new site](https://www.youtube.com/watch?v=kUwzqoqyyKU) — Longer, unedited build-along.
- [The AI that reviews your code for free](https://www.youtube.com/watch?v=9Prrk4KQF24) — Focused on the free CLI path.

---

## Blogs

### Official

- [CodeRabbit deep dive](https://www.coderabbit.ai/blog/coderabbit-deep-dive) — How the multi-stage, multi-model review pipeline is put together, and why a single LLM call is not enough.
- [An AI code reviewer on GitHub, in 4 examples](https://www.coderabbit.ai/blog/how-to-use-an-ai-code-reviewer-on-github-in-4-examples) — Four real review threads from open source repositories, annotated.
- [Introducing CodeRabbit Security](https://www.coderabbit.ai/blog/introducing-coderabbit-security) — Reachability analysis and proposed fixes for suspected vulnerabilities.
- [The pull request outlived its obituaries](https://www.coderabbit.ai/blog/the-pull-request-lives-on-ai-gave-it-a-bigger-job) — Why review volume grew rather than shrank as AI wrote more code.
- [Whose taste is shaping your agentic SDLC?](https://www.coderabbit.ai/blog/taste-decides-what-should-ship) — On preserving engineering judgment when agents do the implementing.
- [$10M for open source](https://www.coderabbit.ai/blog/coderabbit-expands-its-commitment-to-open-source) — What OSS maintainers get for free, and for how long.

### Community

- [CodeRabbit vs other AI review tools](https://www.devtoolsacademy.com/blog/coderabbit-vs-others-ai-code-review-tools) — Independent side-by-side comparison.
- [AI can make a code review for free](https://tomaszs2.medium.com/ai-can-make-a-code-review-for-free-a559cf74efa5) — Early hands-on account of the free tier.
- [Configuration reference walkthrough](https://dev.to/rahulxsingh/coderabbit-configuration-coderabbityaml-reference-5493) — Annotated tour of the YAML, field by field.
- [Setup guide (2026)](https://dev.to/rahulxsingh/how-to-setup-coderabbit-complete-step-by-step-guide-2026-4115) — Community step-by-step, current as of 2026.
- [GitHub integration setup](https://dev.to/rahulxsingh/coderabbit-github-integration-setup-guide-291p) — Install-to-first-review, with screenshots.
- [Pricing explained (2026)](https://dev.to/rahulxsingh/coderabbit-pricing-in-2026-free-tier-pro-plans-and-enterprise-costs-1pc4) — Free tier versus paid plans, in plain terms.
- [Adding CodeRabbit as a reviewer](https://medium.com/@manchireddykavyareddy2312/add-coderabbit-as-a-code-reviewer-in-your-github-workflow-ad8e0a40e502) — Short walkthrough for a single repository.

---

## Media coverage

- [$143M to build the control layer for software change](https://www.coderabbit.ai/blog/introducing-agentic-change-management) — The company's own funding announcement and strategic framing.
- [TechCrunch: CodeRabbit raises $16M](https://techcrunch.com/2024/08/15/coderabbit-raises-16m-to-bring-ai-to-code-reviews/) — Series A coverage and market framing.
- [SiliconANGLE: funding and mission](https://siliconangle.com/2024/08/14/ai-code-review-startup-coderabbit-raises-16m-help-developers-debug-code-faster/) — Product positioning at the time of the raise.
- [Newsroom](https://www.coderabbit.ai/newsroom) — Press releases and coverage, maintained by the company.

---

## Community reviews

Opinions vary, and the honest ones are the most useful. These are listed as evidence to weigh, not as endorsements.

- [G2 reviews](https://www.g2.com/products/coderabbit/reviews) — Verified user ratings, with volume enough to spot patterns.
- [Does it catch real bugs?](https://curatorbits.com/reviews/coderabbit/) — Hands-on test focused on true positives versus noise.
- [Specialist PR review, and who should pay for it](https://aicoderscope.com/blog/coderabbit-review-2026/) — Where the tool fits, and where it does not.
- [Is AI code review worth it?](https://weavai.app/blog/en/2026/04/30/coderabbit-2026-review-is-ai-code-review-worth-24-mo/) — Cost/benefit from a small-team perspective.
- [Features, pricing, and verdict](https://max-productive.ai/ai-tools/coderabbit/) — Feature-by-feature assessment.
- [Pros and cons](https://aisotools.com/blog/coderabbit-review-2026) — Summary of recurring praise and complaints.
- [A reviewer's own take](https://tomaszs2.medium.com/ai-code-review-tool-coderabbit-replaces-me-and-i-like-it-b1350a9cda58) — What changes when the bot reviews first.

Recurring themes worth knowing before you adopt: summaries and walkthroughs are widely liked; review latency grows with PR size, so large PRs feel slow; and completeness on complex changes is not a substitute for human review. Running CodeRabbit as advisory first, then tightening `pre_merge_checks` to `error` once the signal is trusted, is the pattern most teams describe.

---

## Projects using CodeRabbit

Open source repositories where you can read real review threads. Example reviews are worth clicking — they show what the output actually looks like on a mature codebase.

- [Appsmith](https://github.com/appsmithorg/appsmith) — Low-code internal tools platform. [Example review](https://github.com/appsmithorg/appsmith/pull/37200)
- [Crowd.dev](https://github.com/CrowdDotDev/crowd.dev) — Developer community intelligence platform. [Example review](https://github.com/CrowdDotDev/crowd.dev/pull/2671)
- [Documenso](https://github.com/documenso/documenso) — Open source document signing. [Example review](https://github.com/documenso/documenso/pull/1436)
- [Formbricks](https://github.com/formbricks/formbricks) — Survey and experience management. [Example review](https://github.com/formbricks/formbricks/pull/4229)
- [Neon](https://github.com/neondatabase/neon) — Serverless Postgres. [Example review](https://github.com/neondatabase/neon/pull/9100)
- [HeroUI (NextUI)](https://github.com/nextui-org/nextui) — React component library. [Example review](https://github.com/nextui-org/nextui/pull/3680)
- [Novu](https://github.com/novuhq/novu) — Notification infrastructure. [Example review](https://github.com/novuhq/novu/pull/5401)
- [OpenObserve](https://github.com/openobserve/openobserve) — Cloud-native observability. [Example review](https://github.com/openobserve/openobserve/pull/4865)
- [Permify](https://github.com/Permify/permify) — Authorization service and policy engine. [Example review](https://github.com/Permify/permify/pull/1754)
- [Pipedream](https://github.com/PipedreamHQ/pipedream) — Workflow automation and API connectors. [Example review](https://github.com/PipedreamHQ/pipedream/pull/14498)
- [Plane](https://github.com/makeplane/plane) — Project management. [Example review](https://github.com/makeplane/plane/pull/5933)
- [Unkey](https://github.com/unkeyed/unkey) — API key management. [Example review](https://github.com/unkeyed/unkey/pull/2639)
- [UploadThing](https://github.com/pingdotgg/uploadthing) — File uploads for modern web apps. [Example review](https://github.com/pingdotgg/uploadthing/pull/1038)
- [it-at-m/refarch](https://github.com/it-at-m/refarch) — Reference architecture components; a readable [`.coderabbit.yaml`](https://github.com/it-at-m/refarch/blob/main/.coderabbit.yaml) in a public-sector context.
- [NVIDIA NeMo Skills](https://github.com/NVIDIA-NeMo/Skills) — Research tooling with a tuned [`.coderabbit.yaml`](https://github.com/NVIDIA-NeMo/Skills/blob/main/.coderabbit.yaml).

Browse more via the [`coderabbit` GitHub topic](https://github.com/topics/coderabbit).

---

## Repository documentation

This list is built and maintained like a small software project. If you are forking it, extending it, or building something similar, these documents are the whole design.

| Document | Purpose |
| --- | --- |
| [`docs/vision.md`](docs/vision.md) | What this project is for, its principles, non-goals, and roadmap. |
| [`docs/system-overview.md`](docs/system-overview.md) | How CodeRabbit works, and how that shapes the way this list is organized. |
| [`docs/architecture.md`](docs/architecture.md) | The layered architecture of the repository, with diagrams. |
| [`docs/workflow.md`](docs/workflow.md) | Contribution and validation workflow, from fork to merge. |
| [`docs/build-plan.md`](docs/build-plan.md) | A phase-by-phase plan for building this repository from an empty directory. |
| [`docs/configuration-guide.md`](docs/configuration-guide.md) | Field reference for the starter configs, plus how to validate them. |
| [`docs/adr/`](docs/adr/) | Architecture decision records: why the structure is what it is. |
| [`schema/`](schema/) | The JSON Schema used to validate every config example in this repo. |
| [`.coderabbit.yaml`](.coderabbit.yaml) | This list's own config — it is reviewed by the tool it documents. |

---

## Contributing

New resources are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first — it covers the quality bar, the one-line description style, where each kind of link belongs, and the checklist a pull request needs to pass. Adding a config example? [`docs/configuration-guide.md`](docs/configuration-guide.md) explains how to validate it before you open the PR.

Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Documentation and configuration examples in this repository are released under [CC0 1.0 Universal](LICENSE.md) — public domain, no attribution required. Linked resources belong to their respective authors. CodeRabbit is a trademark of its owner; this is an unofficial, community-maintained list.
