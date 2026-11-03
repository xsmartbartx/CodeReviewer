# Security policy

Report vulnerabilities privately to the support address of the deployment (the `SUPPORT_EMAIL` shown on its docs page), or through GitHub's private vulnerability reporting on this repository. Do not open a public issue.

Please include the affected endpoint or file, steps to reproduce, and the impact. We aim to acknowledge reports within two business days.

## Design notes

- GitHub and Stripe webhooks are signature-verified and processed idempotently.
- Session tokens are random, HTTP-only, and stored only as SHA-256 hashes.
- GitHub user tokens are used once during sign-in and never stored.
- Source code is fetched per review and never persisted.
- Pull request content is treated as untrusted model input; for fork pull requests, configuration is read from the base branch.

See [docs/architecture.md](docs/architecture.md) for details.
