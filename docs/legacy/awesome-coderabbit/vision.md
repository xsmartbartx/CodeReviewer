# Vision

## Purpose

A developer evaluating or adopting CodeRabbit currently has to assemble their own map: official docs in one place, a vendor awesome-list in another, community reviews scattered across blogs, and configuration knowledge locked in other people's repositories. This project exists to remove that assembly step.

The target outcome is narrow and measurable: **a developer who has never used CodeRabbit can go from this README to a working, tuned `.coderabbit.yaml` in under fifteen minutes, without reading the full configuration reference.**

## Problem statement

| Problem | Consequence |
| --- | --- |
| The official configuration reference is exhaustive and therefore long | Newcomers copy defaults, get noisy reviews, and conclude the tool is noisy |
| Good configurations live in individual repositories | Every team rediscovers the same path filters and exclusions |
| Vendor material is promotional by nature | Adoption decisions get made without the counter-evidence |
| Link lists rot silently | A list that is 30% dead is worse than no list, because it costs trust |

## Principles

1. **Curate, do not accumulate.** A link earns its place by being the best available resource for one question. Two adequate links are worse than one good one.
2. **Every link carries a one-line description.** A bare URL forces the reader to open a tab to find out whether it is relevant. The description is the product.
3. **Honest over promotional.** Critical reviews and known limitations are listed alongside the marketing material. A reader who discovers the downsides after adopting will not come back.
4. **Examples are opinionated and runnable.** A configuration example that must be edited before it works is a snippet, not an example. Each one is committable as-is.
5. **Structure is enforced, not requested.** Validation in CI beats a style guide nobody reads.
6. **Documented for maintainers, not only readers.** The architecture, workflow, and decision records exist so a second maintainer can take over without asking questions.
7. **Zero trust toward external content.** Contributed links and configurations are untrusted input: verified, reviewed, and never blindly executed.

## Non-goals

Stating these explicitly prevents scope drift, which is the usual death of an awesome list.

- **Not a replacement for the official documentation.** This list routes to it and never paraphrases behavior that might change.
- **Not a review-tool comparison site.** Independent comparisons are linked; this project does not maintain its own competitive matrix.
- **Not a runnable application.** No services, no build step producing an artifact, no runtime dependencies. Markdown, YAML, and one JSON Schema.
- **Not a vendor channel.** Unaffiliated with CodeRabbit. Vendor content is welcome, labeled as such, and held to the same relevance bar.
- **Not a support forum.** Product questions belong in the official support channels.

## Target audiences

| Audience | Their first question | Where the list answers it |
| --- | --- | --- |
| Developer evaluating the tool | "Is this worth adopting?" | Community reviews, projects using it, example review threads |
| Developer onboarding a repo | "What do I put in the YAML?" | `configs/`, configuration guide |
| Tech lead standardizing a team | "How do I gate merges without blocking everyone?" | Pre-merge checks, request-changes workflow, mixed-stack example |
| Platform engineer | "How does this fit our CI and our private Git host?" | Integration guides, self-hosted docs, CLI in headless mode |
| Maintainer of this repo | "Where does a new link go, and what must it pass?" | Contributing guide, architecture, workflow |

## Success measures

Deliberately few, and all observable:

- **Freshness** — no dead links on `main`; link checking runs on a schedule, not only on pull requests.
- **Validity** — every configuration example passes both the local schema and the upstream schema.
- **Time to first config** — a new reader reaches a committed `.coderabbit.yaml` without opening the full reference.
- **Contribution success rate** — a first-time contributor's pull request passes automated checks on the first attempt, because the rules are stated and enforced.
- **Coverage without bloat** — every major CodeRabbit surface (PR review, IDE, CLI, Slack, Discord, API, self-hosted) is represented, and no section is padded to look complete.

## Roadmap

Phrased as outcomes rather than dates.

### Now

- Complete documentation map covering every product surface.
- Six validated starter configurations, including a mixed-stack monorepo.
- Curated schema plus documented validation path.
- Contribution guide with an enforceable checklist.

### Next

- Per-framework examples layered on the language ones: Next.js, Django, FastAPI, Spring Boot, Rails.
- A pre-merge check catalog organized by risk rather than by language: multi-tenancy, payments, PII handling, migrations.
- A short "anti-patterns" document: configurations that look reasonable and produce noise.
- Scheduled link checking with an issue opened automatically when a link dies.

### Later

- A comparison of review profiles with real before/after output on the same pull request.
- Recipes for using CodeRabbit as a check on code written by coding agents.
- Translated section headings, if contributors volunteer to maintain them. Machine translation is not acceptable here.

## Explicit constraints

- **No build step.** The repository must be usable by reading it on GitHub. Any tooling is optional and additive.
- **Kebab-case files and directories**, matching the conventions in the governing repository standards.
- **Markdown for prose, YAML for configuration, JSON for schema.** No other formats, no generated HTML.
- **Every architectural decision recorded.** Changes to structure land as an ADR before they land as a directory rename.

## Related documents

- [`system-overview.md`](system-overview.md) — How CodeRabbit works, and how that shapes this list.
- [`architecture.md`](architecture.md) — The layered structure of the repository.
- [`workflow.md`](workflow.md) — How a contribution moves from fork to merge.
- [`build-plan.md`](build-plan.md) — How to build this repository from an empty directory.
- [`adr/`](adr/) — Decision records.
