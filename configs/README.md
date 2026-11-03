# Starter configurations

Six `.coderabbit.yaml` files you can copy into a repository root. Each one is commented, conservative, and validated in CI against [`../schema/coderabbit.config.schema.json`](../schema/coderabbit.config.schema.json).

| Directory | Use it when |
| --- | --- |
| [`minimal/`](minimal/.coderabbit.yaml) | You want reviews today and will tune later. About 20 lines. |
| [`javascript/`](javascript/.coderabbit.yaml) | Node services or browser code in plain JavaScript. |
| [`typescript/`](typescript/.coderabbit.yaml) | TypeScript app or monorepo, usually with React. |
| [`python/`](python/.coderabbit.yaml) | Python service with tests and database migrations. |
| [`go/`](go/.coderabbit.yaml) | Go service or CLI, with generated protobuf code. |
| [`mixed-stack/`](mixed-stack/.coderabbit.yaml) | Monorepo spanning several languages plus Terraform, Docker, and CI. |

## How to use one

1. Copy the file to the root of your repository as `.coderabbit.yaml`.
2. Fix the `path_filters` to match your real directory names — this is the single highest-impact edit.
3. Delete any `path_instructions` block that does not describe how your team actually reviews.
4. Commit it on a branch and open a pull request. CodeRabbit reads the config from the branch under review, so you see the effect immediately.
5. Comment `@coderabbitai configuration` on that PR to confirm the resolved settings are what you expect.

## Design choices shared by all six

- **Exclusions before inclusions.** Generated code, lockfiles, vendored dependencies, and build output dominate a diff and produce findings nobody acts on.
- **`profile: "chill"`.** Balanced by default. Move to `quiet` if the team still finds it noisy, `assertive` if they want everything.
- **`request_changes_workflow: false`.** Start advisory. Turn it on once the signal is trusted, so a failing check means something.
- **`pre_merge_checks` at `warning`.** A gate that blocks on day one gets disabled by day three. Promote to `error` deliberately.
- **Path instructions written as review policy**, not style rules. Formatting belongs to your linters; these files say what a human reviewer would push back on.

## Editor autocomplete

Every file starts with a schema comment:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
```

With the YAML extension installed, VS Code will autocomplete field names and flag invalid enum values as you type. That pointer targets CodeRabbit's authoritative schema. The local schema in [`../schema/`](../schema/) is a smaller, stricter subset used only to validate the examples in this repository — see [`../docs/configuration-guide.md`](../docs/configuration-guide.md) for the difference and why both exist.

## Contributing a new example

Read [`../CONTRIBUTING.md`](../CONTRIBUTING.md). In short: one directory per stack, a commented file that explains *why* each block is there, no secrets or internal hostnames, and validation passing before you open the pull request.
