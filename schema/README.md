# Schema

[`coderabbit.config.schema.json`](coderabbit.config.schema.json) is a JSON Schema (draft 2020-12) used to validate every `.coderabbit.yaml` example in [`../configs/`](../configs/).

## What it is for

Catching mistakes in *this repository's* examples before they reach a reader who copies them:

- misspelled field names (`path_instruction` instead of `path_instructions`)
- invalid enum values (`profile: "balanced"` — there is no such profile)
- wrong types (`threshold: "80"` as a string)
- misspelled analyzer names under `reviews.tools`
- structural errors in `path_instructions` and `custom_checks` entries

## What it is not

It is **not** the authoritative CodeRabbit schema. It covers a curated subset of fields — the ones these examples use — and it rejects unknown keys on purpose. A perfectly valid CodeRabbit config can fail this schema simply by using a field the examples do not demonstrate.

| | This schema | Upstream schema |
| --- | --- | --- |
| Location | [`coderabbit.config.schema.json`](coderabbit.config.schema.json) | <https://coderabbit.ai/integrations/schema.v2.json> |
| Coverage | Curated subset | Every field CodeRabbit accepts |
| Unknown keys | Rejected | Tolerated |
| Purpose | Guard the examples in this repo | Editor autocomplete and real-world validation |
| Authority | Community-maintained | Vendor-maintained |

Use the upstream schema in your own repository. Use this one when contributing examples here.

The reasoning behind keeping two schemas is recorded in [`../docs/adr/ADR-0002-configuration-validation.md`](../docs/adr/ADR-0002-configuration-validation.md).

## Validating locally

Any JSON Schema validator that reads YAML works. With Node.js and no repository-level tooling:

```bash
npx --yes ajv-cli@5 validate \
  --spec=draft2020 \
  -s schema/coderabbit.config.schema.json \
  -d "configs/*/.coderabbit.yaml"
```

With Python:

```bash
pip install check-jsonschema
check-jsonschema --schemafile schema/coderabbit.config.schema.json configs/*/.coderabbit.yaml
```

Then check the same files against the upstream schema, which is the one that actually matters at review time:

```bash
check-jsonschema \
  --schemafile https://coderabbit.ai/integrations/schema.v2.json \
  configs/*/.coderabbit.yaml
```

[`../docs/workflow.md`](../docs/workflow.md) describes how both checks run on every pull request.

## Keeping it current

CodeRabbit ships new fields regularly. When upstream adds something an example should demonstrate:

1. Read the field in the [configuration reference](https://docs.coderabbit.ai/reference/configuration) — name, type, enum values, and default.
2. Add it to this schema in the same shape upstream uses.
3. Use it in at least one example, with a comment explaining when it helps.
4. Note the addition in the pull request description.

Fields are added here only when an example uses them. An unused field in a validation schema is untested surface.
