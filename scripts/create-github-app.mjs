#!/usr/bin/env node
// Registers a CodeReviewer GitHub App from a manifest and prints its credentials as env lines.
// Usage: node scripts/create-github-app.mjs --url https://reviews.example.com [--org my-org] [--name "CodeReviewer"]
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    org: { type: "string" },
    name: { type: "string", default: "CodeReviewer" },
    port: { type: "string", default: "3456" },
    private: { type: "boolean", default: false },
  },
});

if (!values.url || !/^https?:\/\//.test(values.url)) {
  console.error("Pass the public URL of your deployment: --url https://reviews.example.com");
  process.exit(1);
}

const appUrl = values.url.replace(/\/$/, "");
const port = Number(values.port);
const state = randomBytes(16).toString("hex");

const manifest = {
  name: values.name,
  url: appUrl,
  description: "AI pull request reviews powered by Claude.",
  hook_attributes: { url: `${appUrl}/api/github/webhook`, active: true },
  redirect_url: `http://localhost:${port}/callback`,
  callback_urls: [`${appUrl}/api/auth/callback`],
  setup_url: `${appUrl}/dashboard`,
  setup_on_update: true,
  public: !values.private,
  default_permissions: {
    pull_requests: "write",
    contents: "read",
    checks: "write",
    issues: "read",
    metadata: "read",
  },
  default_events: ["pull_request", "issue_comment"],
};

const target = values.org
  ? `https://github.com/organizations/${encodeURIComponent(values.org)}/settings/apps/new?state=${state}`
  : `https://github.com/settings/apps/new?state=${state}`;

const escape = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);

  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html><meta charset="utf-8"><title>Create GitHub App</title>
<body style="font-family:system-ui;max-width:40rem;margin:4rem auto">
<h1>Create the CodeReviewer GitHub App</h1>
<p>GitHub will ask you to confirm the app name and create it under ${values.org ? `the <b>${escape(values.org)}</b> organization` : "your account"}.</p>
<form action="${escape(target)}" method="post">
<input type="hidden" name="manifest" value="${escape(JSON.stringify(manifest))}">
<button style="font-size:1rem;padding:.6rem 1rem">Continue to GitHub</button>
</form></body>`);
    return;
  }

  if (url.pathname === "/callback") {
    if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
      res.writeHead(400).end("State mismatch. Restart the script.");
      return;
    }
    const response = await fetch(`https://api.github.com/app-manifests/${url.searchParams.get("code")}/conversions`, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      res.writeHead(502).end(`GitHub returned ${response.status}. Restart the script.`);
      console.error(await response.text());
      server.close();
      return;
    }
    const app = await response.json();
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:40rem;margin:4rem auto">
<h1>Created ${escape(app.name)}</h1><p>The credentials are printed in your terminal. You can close this tab.</p></body>`);

    // Printed rather than written to disk so no credentials file is left behind.
    console.log(`\nCreated GitHub App "${app.name}" (${app.html_url}).`);
    console.log("Add these lines to your environment (.env or your host's secret settings):\n");
    console.log(
      [
        `GITHUB_APP_ID=${app.id}`,
        `GITHUB_APP_SLUG=${app.slug}`,
        `GITHUB_APP_PRIVATE_KEY="${app.pem.trim().replace(/\n/g, "\\n")}"`,
        `GITHUB_WEBHOOK_SECRET=${app.webhook_secret}`,
        `GITHUB_CLIENT_ID=${app.client_id}`,
        `GITHUB_CLIENT_SECRET=${app.client_secret}`,
      ].join("\n"),
    );
    server.close();
    return;
  }

  res.writeHead(404).end();
});

server.listen(port, () => {
  console.log(`Open http://localhost:${port} in your browser to create the GitHub App.`);
});
