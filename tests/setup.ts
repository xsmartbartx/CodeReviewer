// Deterministic environment for every test file. Real secrets are never needed.
Object.assign(process.env, {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  GITHUB_APP_ID: "12345",
  GITHUB_APP_SLUG: "codereviewer",
  GITHUB_APP_PRIVATE_KEY: "test-key",
  GITHUB_WEBHOOK_SECRET: "test-webhook-secret",
  GITHUB_CLIENT_ID: "test-client-id",
  GITHUB_CLIENT_SECRET: "test-client-secret",
  ANTHROPIC_API_KEY: "test-anthropic-key",
});
