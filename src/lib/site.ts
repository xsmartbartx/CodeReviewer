export const site = {
  name: "CodeReviewer",
  tagline: "AI code review on every pull request",
  description:
    "CodeReviewer reviews every GitHub pull request with Claude: a clear summary, line-by-line comments with ready-to-apply fixes, and checks that gate risky merges.",
};

/** Operator details shown on public pages. Read at request time so one image serves any deployment. */
export function operator() {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    company: process.env.COMPANY_NAME || "CodeReviewer",
    supportEmail: process.env.SUPPORT_EMAIL || `support@${new URL(appUrl).hostname}`,
    appUrl,
    slug: process.env.GITHUB_APP_SLUG || "codereviewer",
  };
}
