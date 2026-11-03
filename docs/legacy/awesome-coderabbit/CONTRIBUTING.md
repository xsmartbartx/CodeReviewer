# Contributing

Thanks for helping keep this list useful. Contributions are welcome and the bar is specific rather than high — most rejected pull requests fail on one of a handful of things listed below, all of which are easy to get right the first time.

## Contents

- [What belongs here](#what-belongs-here)
- [What does not](#what-does-not)
- [Adding a link](#adding-a-link)
- [Adding a configuration example](#adding-a-configuration-example)
- [Adding or changing documentation](#adding-or-changing-documentation)
- [Before you open a pull request](#before-you-open-a-pull-request)
- [Pull request checklist](#pull-request-checklist)
- [Review process](#review-process)
- [Style rules](#style-rules)
- [Reporting a problem](#reporting-a-problem)

---

## What belongs here

Anything that helps a developer find, understand, configure, or evaluate CodeRabbit:

- Official documentation pages not yet in the documentation map.
- Tutorials, guides, and videos that teach something specific.
- Configuration examples for a stack or framework not yet covered.
- Integration guides for a platform, CI system, or tool.
- Honest reviews — favorable or critical. Critical ones are especially welcome; credibility is the point of the list.
- Open source repositories with a public `.coderabbit.yaml` and readable review threads.
- Corrections. A dead link or a stale description is a real bug here.

## What does not

Read [`docs/vision.md`](docs/vision.md) for the full non-goals. In short, we decline:

- **Duplicate coverage.** If an equivalent resource is already listed, propose replacing it and say why yours is better.
- **Content-marketing pieces** that mention CodeRabbit in passing to rank for a keyword.
- **Affiliate or referral links**, in any form.
- **Paywalled resources** presented as freely available.
- **Comparison matrices** maintained by us. We link independent comparisons; we do not run our own.
- **Behavior documentation.** We link to the official docs rather than paraphrasing what the product does, because paraphrases go stale silently.
- **Self-promotion with no substance.** Your own blog post is welcome if it teaches something a reader cannot get elsewhere.

---

## Adding a link

One line, in one section:

```markdown
- [Resource name](https://example.com/page) — What the reader gets from it, in one line.
```

Rules:

1. **Open it first.** An HTTP 200 is not a review. Confirm the content is current and matches your description.
2. **Pick one section.** The one a reader would look in first. Cross-listing the same link is the fastest way to make the README unbrowsable.
3. **Describe the payoff, not the title.** "Four before/after reviews on real pull requests" beats "A blog post about code reviews".
4. **Keep it to one line.** Under about 100 characters after the dash. If it needs a paragraph, it probably belongs in `docs/`.
5. **Use an em dash** (`—`) between the link and the description, matching every existing entry.
6. **Prefer the canonical URL.** No tracking parameters, no shorteners, no AMP variants.
7. **Alphabetize within a section** where the existing section is alphabetized; otherwise append.

For a repository under *Projects using CodeRabbit*, include an example review link — the review thread is what makes the entry useful:

```markdown
- [Project](https://github.com/org/project) — One line on what the project is. [Example review](https://github.com/org/project/pull/123)
```

---

## Adding a configuration example

Configuration examples get more scrutiny than links, because readers copy them into production repositories.

### Layout

One directory per stack or framework, kebab-case, with the file named exactly `.coderabbit.yaml`:

```
configs/
└── your-stack/
    └── .coderabbit.yaml
```

Then add a row to [`configs/README.md`](configs/README.md) and to the configuration table in the [`README.md`](README.md).

### Requirements

- [ ] **Committable as-is.** No `TODO`, no `<your-org>`, no placeholder that must be filled in before it works.
- [ ] **Starts with the schema comment** so editors give autocomplete:
      `# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json`
- [ ] **Comments explain why, not what.** `# Skip generated protobuf: findings here are never actionable` is useful. `# set path filters` is not.
- [ ] **`path_filters` reflect a real project layout**, including the exclusions that stack actually needs.
- [ ] **Conservative defaults.** `profile: "chill"`, `request_changes_workflow: false`, and `pre_merge_checks` at `warning`. An example that blocks merges on day one will be deleted by the reader before it helps them.
- [ ] **No security analyzer disabled** and no check set to `off` without a comment explaining why.
- [ ] **No secrets.** No tokens, keys, internal hostnames, private repository names, customer names, or real user handles.
- [ ] **Passes both schema checks.** See below.

### Validate before you push

```bash
# Local curated schema: catches typos and unknown keys
check-jsonschema --schemafile schema/coderabbit.config.schema.json configs/*/.coderabbit.yaml

# Upstream schema: catches fields CodeRabbit would reject
check-jsonschema --schemafile https://coderabbit.ai/integrations/schema.v2.json configs/*/.coderabbit.yaml
```

Node alternative:

```bash
npx --yes ajv-cli@5 validate --spec=draft2020 \
  -s schema/coderabbit.config.schema.json \
  -d "configs/*/.coderabbit.yaml"
```

If your example needs a field the local schema does not yet know, add it to [`schema/coderabbit.config.schema.json`](schema/coderabbit.config.schema.json) in the same pull request, matching the upstream name, type, enum, and bounds exactly. [`schema/README.md`](schema/README.md) explains the two-schema arrangement.

---

## Adding or changing documentation

Everything in [`docs/`](docs/) follows the same standards:

- **Technical tone.** Precise, concise, no marketing language.
- **Structure over prose.** Headings, tables, and lists. Diagrams where they clarify something a table cannot.
- **Mermaid for diagrams**, inline in the Markdown. No binary images — they cannot be diffed or reviewed.
- **Link behavior, do not restate it.** Anything CodeRabbit might change gets a link, not a paraphrase.
- **Cross-link in both directions.** A new document gets a row in the README's repository-documentation table and a link from the related documents section of its neighbors.
- **Structural changes need an ADR first.** Directory renames, layer changes, and dependency-rule changes land as a decision record before they land as a diff. Copy the shape of [`docs/adr/ADR-0001-repository-architecture.md`](docs/adr/ADR-0001-repository-architecture.md), use the next number, and state the alternatives you rejected.

ADRs are append-only. To change an accepted decision, write a new ADR that supersedes it rather than editing the old one.

---

## Before you open a pull request

```bash
# 1. Markdown style — blank lines around lists and after headings are required
npx --yes markdownlint-cli2 "**/*.md"

# 2. Links in files you changed
npx --yes markdown-link-check README.md

# 3. YAML parses
python -c "import sys,yaml;[yaml.safe_load(open(f)) for f in sys.argv[1:]]" configs/*/.coderabbit.yaml

# 4. Both schema checks (see above)
```

The most common failure by a wide margin is a missing blank line before a list or after a heading. CommonMark requires it, and GitHub renders the list as a paragraph without it.

---

## Pull request checklist

Copy this into your pull request description and tick what applies.

```markdown
### Type of change
- [ ] New link
- [ ] New configuration example
- [ ] Documentation
- [ ] Fix (dead link, typo, stale description)

### Every pull request
- [ ] The change fits the scope in docs/vision.md
- [ ] Kebab-case naming, correct directory
- [ ] Markdown lint passes
- [ ] The description says what changed and why

### New link
- [ ] I opened the link and read the content
- [ ] It is in exactly one section
- [ ] One-line description, describing the payoff
- [ ] Not a duplicate; if it replaces an entry, I said why
- [ ] Canonical URL, no tracking parameters, no affiliate link

### New configuration example
- [ ] Committable as-is, no placeholders
- [ ] Starts with the schema comment
- [ ] Comments explain why, not what
- [ ] No secrets, internal hostnames, or private repository names
- [ ] No security analyzer disabled without a justifying comment
- [ ] Passes the local schema
- [ ] Passes the upstream schema
- [ ] Added to configs/README.md and the README table

### Documentation
- [ ] Behavior is linked, not paraphrased
- [ ] Mermaid diagrams render
- [ ] Cross-links updated in both directions
- [ ] Structural change carries an ADR
```

---

## Review process

1. Automated checks run: markdown lint, link check, YAML parse, both schema validations, secret scan. Each fails independently and names the problem.
2. CodeRabbit reviews the pull request — this list is reviewed by the tool it documents.
3. A maintainer reviews against the checklist in [`docs/workflow.md`](docs/workflow.md).
4. Feedback is specific and actionable. If something is unclear, say so; an unclear rule is our bug, not yours.
5. Merges are squashed. `main` is always the published state, so it must stay green.

There is no release cycle. Your merged change is live immediately.

---

## Style rules

| Element | Rule |
| --- | --- |
| Link entries | `- [Name](url) — Description.` with an em dash |
| Descriptions | One line, under about 100 characters, describing the payoff |
| Lists | Blank line before the list and after the heading |
| Directories | kebab-case |
| Documentation files | kebab-case, `.md` |
| ADR files | `ADR-NNNN-kebab-case.md`, next number in sequence |
| Config files | exactly `.coderabbit.yaml` |
| Tone | Technical and plain. No marketing language, no emoji in documentation |
| Diagrams | Mermaid, inline, never binary images |

---

## Reporting a problem

Open an issue for anything you notice and do not want to fix yourself:

- **Dead or redirected link** — include the entry and what you found instead.
- **Stale description** — a resource that no longer says what we claim.
- **Invalid configuration example** — include the validation error.
- **Missing coverage** — a CodeRabbit surface or stack with no resources listed.

A well-reported dead link is as valuable a contribution as a new section.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
