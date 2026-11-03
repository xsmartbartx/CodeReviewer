# ADR 0001: Repository architecture

## Status

Accepted

## Date

2026-09-10

## Context

This repository is a curated list of CodeRabbit resources plus a set of runnable configuration examples. It has no runtime and no build step, which makes it tempting to treat as a single file that grows.

That approach fails predictably. Observing how comparable lists decay, three failure modes recur:

- **Structural drift.** New sections are added wherever they fit, until the same resource appears in three places and none of them is authoritative.
- **Silent rot.** Links die, examples reference fields that no longer exist, and nobody notices because nothing verifies them.
- **Maintainer lock-in.** The rules live in one person's head. When they stop, contributions stall because nobody knows what "good" means.

The repository also has requirements that a flat structure cannot satisfy:

- Configuration examples must be machine-validated, which requires a stable contract separate from the content.
- Contributed content is untrusted input and must pass through a defined boundary before merge.
- A second maintainer must be able to take over from the documentation alone.
- The governing organizational standards mandate layered architecture, kebab-case naming, ADR governance, Mermaid diagrams, and a zero-trust posture toward external input.

## Decision

Adopt a **layered architecture with one-directional dependencies**, five layers, and explicit boundary rules.

### Layers

| Layer | Contents | Responsibility |
| --- | --- | --- |
| 1. Contract | `schema/` | Define what a valid configuration example is |
| 2. Content | Curated links, `configs/*/.coderabbit.yaml` | Hold the material readers came for |
| 3. Presentation | `README.md`, directory READMEs | Make content findable |
| 4. Documentation | `docs/` | Explain intent and structure |
| 5. Governance | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE.md`, `.github/` | Make the rules enforceable |

### Dependency rules

1. Dependencies point in one direction: Contract → Content → Presentation → Documentation. Governance constrains Content and Documentation.
2. The Contract layer has no inbound dependencies from this repository, so it can be validated in isolation.
3. Presentation may reference Content and Documentation. Content may not reference Presentation — a configuration example must stand alone outside this repository.
4. No layer reaches two levels up.
5. ADRs are append-only. A changed decision becomes a new ADR that supersedes the old one.

### Supporting rules

- Every content item carries exactly one line of description.
- Every link appears in exactly one section.
- Every configuration example is committable as-is and validated in CI.
- Every governance rule is either automatically checked or on the human review checklist. A rule that is neither is deleted.
- Behavior of external systems is linked, never paraphrased in prose that can go stale.
- Naming is kebab-case for directories and documentation files, with two documented exceptions: root governance files follow ecosystem convention in SCREAMING_SNAKE, and configuration examples keep the literal upstream filename `.coderabbit.yaml`.

## Rationale

The layering exists to make specific failures impossible rather than merely discouraged.

| Rule | Failure it prevents |
| --- | --- |
| Contract separated from content | An example that looks fine and is invalid |
| One-directional dependencies | A schema change cascading into README edits |
| Content independent of presentation | Examples that only make sense inside this repository |
| Documentation as its own layer | Rules living only in a maintainer's head |
| Governance rules that must be checkable | A style guide nobody applies |
| Append-only ADRs | Losing the reasoning behind the structure |
| Behavior linked, not paraphrased | Documentation that is confidently wrong six months later |

The stack-per-directory layout for configuration examples means adding a language touches exactly three things: a new directory, a row in `configs/README.md`, and a row in the README table. Extension cost stays flat as the repository grows, which is the property a list needs most.

## Consequences

### Positive

- Structural changes are visible and reviewable rather than incidental.
- Configuration examples are verifiable, so a reader can copy one with confidence.
- A new maintainer can onboard from `docs/` alone.
- Contributors have a stated bar, so first-attempt success rate goes up.
- Contributed content passes a defined trust boundary before merge.
- Adding a stack, a link, or a schema field has a known, small cost.

### Negative

- More upfront documentation than a single-file list requires.
- Six files for a repository that could be one, which will look over-engineered to a casual visitor.
- Structural changes require an ADR, which adds friction — intentionally.
- Two schemas to keep aligned, addressed in ADR 0002.

### Neutral

- No build step and no releases. `main` is always the published state, so every merge must keep it green.

## Alternatives considered

### 1. Single-file awesome list

A conventional `README.md` and nothing else.

Rejected because configuration examples cannot be machine-validated inside a Markdown file, contributors get no stated bar, and there is no place to record why the structure is what it is. This works for a list of twenty links and fails at two hundred.

### 2. Static site generator

Docusaurus, MkDocs, or similar, with a published documentation site.

Rejected because it introduces a build step, a dependency tree, and a deployment surface for content that GitHub already renders well. It would also make the repository harder to contribute to, in exchange for styling. The non-goal "not a runnable application" comes directly from this rejection.

### 3. Content-type layering instead of architectural layering

Group by media type — `links/`, `videos/`, `articles/` — rather than by architectural role.

Rejected because it optimizes for the maintainer's filing system rather than the reader's question. A reader asking "how do I configure this for Go" does not care whether the answer is a link or a YAML file. It also puts the schema and the examples in unrelated places despite their contract relationship.

### 4. Monorepo with generated output

Source content in structured data, README generated by a script.

Rejected as premature. It solves duplication that does not exist yet, and it breaks the property that a contributor can fix a typo by editing the file they are reading. Worth revisiting only if the same link genuinely needs to appear in several generated views.

## Final notes

This ADR defines the structural foundation for the repository. Any change to layer definitions, dependency direction, or directory layout must reference and extend it.

The related decision on configuration validation is recorded in [ADR 0002](ADR-0002-configuration-validation.md).
