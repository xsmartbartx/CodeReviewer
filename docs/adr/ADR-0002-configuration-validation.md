# ADR 0002: Configuration validation strategy

## Status

Accepted

## Date

2026-09-10

## Context

This repository ships `.coderabbit.yaml` examples intended to be copied directly into other people's repositories. An invalid example is worse than no example: the reader commits it, the review behaves unexpectedly, and the failure is attributed to CodeRabbit rather than to the list.

Constraints:

- CodeRabbit publishes an authoritative JSON Schema at `https://coderabbit.ai/integrations/schema.v2.json`, roughly 2,300 lines, covering the full field set including sixty-plus analyzer toggles.
- That schema evolves continuously as features ship.
- It is permissive about unknown keys, so a misspelled field name can validate against it while doing nothing at review time.
- Validation must run in CI without secrets and without a heavy toolchain.
- Network access to the upstream schema cannot be assumed on every CI run.
- The organizational standards require deterministic CI and treat external input as untrusted.

The tension is direct. The upstream schema is authoritative but tolerant. A misspelled field is the most likely mistake in a hand-written example, and the authoritative schema will not catch it.

## Decision

Use **two schemas with distinct jobs**, and validate every example against both.

### 1. Local curated schema — `schema/coderabbit.config.schema.json`

- JSON Schema draft 2020-12.
- Covers only the subset of fields the examples actually use.
- `additionalProperties: false` on every defined object, so unknown keys fail.
- `propertyNames` constrained by an enum for `reviews.tools`, so a misspelled analyzer name fails.
- Enums, types, and numeric bounds mirror upstream exactly.
- A field is added only when an example uses it.

### 2. Upstream schema — referenced by URL, never vendored

- Fetched at validation time from `https://coderabbit.ai/integrations/schema.v2.json`.
- Referenced from the first line of every example via `# yaml-language-server: $schema=...`, giving editor autocomplete.
- A validation error against it fails CI. A **network** error warns rather than failing.

### Division of responsibility

| Concern | Caught by |
| --- | --- |
| Misspelled field name | Local schema |
| Misspelled analyzer name | Local schema |
| Invalid enum value | Both |
| Wrong type | Both |
| Structural error in an array item | Both |
| Field that upstream no longer accepts | Upstream schema |
| Field upstream never accepted | Upstream schema |
| Editor autocomplete while writing | Upstream schema |

Neither schema alone is sufficient. The local one is strict but incomplete; the upstream one is complete but tolerant.

## Rationale

**Why not upstream only.** It tolerates unknown keys. `path_instruction` instead of `path_instructions` passes validation and silently does nothing. That is precisely the class of bug an example must never ship with.

**Why not local only.** It would drift out of date, and would eventually claim a field is invalid when CodeRabbit accepts it, or accept a field CodeRabbit has removed. The vendor's schema is the only correct answer to "would CodeRabbit accept this".

**Why not vendor a copy of the upstream schema.** A committed copy is stale from the first upstream release. Nobody would notice for months, and the checked-in copy would become quietly authoritative in the repository while being wrong. Referencing by URL keeps the authority where it belongs.

**Why keep the local schema small.** A field in a validation schema that no example exercises is untested surface. Growing the local schema toward parity with upstream would recreate the drift problem this decision avoids.

**Why tolerate upstream network failure.** A CodeRabbit outage or a CI network hiccup should not block someone fixing a typo in a link description. A real validation error still fails; only unreachability degrades to a warning. This keeps CI deterministic in the sense that matters: the same content produces the same verdict.

## Consequences

### Positive

- Typos in examples cannot reach `main`.
- Examples are verified against what CodeRabbit actually accepts.
- Editor autocomplete works for anyone writing a config, in this repository or their own.
- No vendored schema to go stale.
- CI needs no secrets and no heavy toolchain; standard Node or Python validators suffice.
- Contributors get a clear, local pre-flight check.

### Negative

- Two artifacts to keep aligned. When upstream adds a field an example should use, the local schema must be updated in the same pull request.
- The local schema will reject valid configurations that use fields no example demonstrates. This is correct for this repository and confusing at first glance, so `schema/README.md` states it explicitly.
- CI depends on an external URL for one of the two checks.

### Neutral

- The local schema is unversioned. It is versioned by repository history, and breaking changes to it land with an ADR.

## Alternatives considered

### 1. Upstream schema only

Simplest option, one artifact.

Rejected because it cannot catch a misspelled field, which is the most likely and most damaging error in a hand-written example.

### 2. Vendored copy of the upstream schema

Commit `schema.v2.json` and validate offline.

Rejected because the copy is stale immediately and its staleness is invisible. It would also mean a 2,300-line vendored file dominating the repository, and it invites contributors to edit the vendor's schema.

### 3. Generate the local schema from upstream

A script that fetches upstream and narrows it to the used subset.

Rejected as premature. It adds a build step to a repository whose non-goals explicitly exclude one, and the subset is small enough to maintain by hand. Worth revisiting if the local schema grows past a few hundred lines.

### 4. Custom linter instead of JSON Schema

A purpose-built script encoding the rules.

Rejected because JSON Schema is standardized, tool-supported, editor-integrated, and readable by contributors who have never seen this repository. A custom linter would be code to maintain, in a repository that deliberately contains none.

## Final notes

The two-schema arrangement is a deliberate trade: some duplication in exchange for catching the errors that matter most. If the local schema starts approaching parity with upstream, that is the signal to revisit alternative 3.

Structural context for this decision is in [ADR 0001](ADR-0001-repository-architecture.md). Operational detail is in [`../workflow.md`](../workflow.md) and [`../../schema/README.md`](../../schema/README.md).
