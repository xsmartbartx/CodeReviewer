# CodeRabbit configuration examples

Six `.coderabbit.yaml` files from the project this repository started as. CodeReviewer reads the compatible subset of a `.coderabbit.yaml` when a repository has no `.codereviewer.yaml`, and `tests/config.test.ts` parses every file here to prove that migration path keeps working.

| Directory | Stack |
| --- | --- |
| `minimal/` | Smallest useful config |
| `javascript/` | Node.js and browser JavaScript |
| `typescript/` | TypeScript services and front ends |
| `python/` | Python services and libraries |
| `go/` | Go modules |
| `mixed-stack/` | Monorepo with several languages and infrastructure code |

For the native format, see [`../.codereviewer.yaml`](../.codereviewer.yaml).
