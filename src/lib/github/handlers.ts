import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, repositories } from "@/db/schema";
import { env, requireGitHub } from "@/lib/env";
import { queue, type JobQueue } from "@/lib/queue";
import { repoPort } from "./app";
import { helpText, parseCommand, TRUSTED_ASSOCIATIONS } from "./commands";
import type { GitHubPort } from "./port";

type GitHubAccount = { id: number; login: string; type?: string; avatar_url?: string };
type RepoRef = { id: number; full_name: string; private: boolean };

type InstallationPayload = {
  action: string;
  installation: { id: number; account: GitHubAccount | null; suspended_at?: string | null };
  repositories?: RepoRef[];
};

type InstallationRepositoriesPayload = {
  action: "added" | "removed";
  installation: { id: number; account: GitHubAccount | null };
  repositories_added: RepoRef[];
  repositories_removed: RepoRef[];
};

type PullRequestPayload = {
  action: string;
  installation?: { id: number };
  number: number;
  repository: RepoRef & { owner: GitHubAccount; name: string };
};

type IssueCommentPayload = {
  action: string;
  installation?: { id: number };
  issue: { number: number; pull_request?: object; user: { login: string } };
  comment: { id: number; body: string; author_association: string; user: { login: string; type: string } };
  repository: RepoRef & { owner: GitHubAccount; name: string };
};

export type WebhookDeps = {
  queue: JobQueue;
  portFor: (installationId: number, owner: string, repo: string) => Promise<GitHubPort>;
};

const defaultDeps = (): WebhookDeps => ({ queue: queue(), portFor: repoPort });

const REVIEW_ACTIONS = new Set(["opened", "reopened", "synchronize", "ready_for_review"]);

export async function upsertAccount(account: GitHubAccount, installationId: number | null, suspended = false) {
  const values = {
    githubAccountId: account.id,
    login: account.login,
    type: account.type ?? "Organization",
    avatarUrl: account.avatar_url ?? null,
    installationId,
    installationSuspended: suspended,
  };
  const [row] = await db()
    .insert(accounts)
    .values(values)
    .onConflictDoUpdate({ target: accounts.githubAccountId, set: values })
    .returning();
  return row!;
}

async function upsertRepos(accountId: string, repos: RepoRef[]) {
  for (const repo of repos) {
    await db()
      .insert(repositories)
      .values({ accountId, githubRepoId: repo.id, fullName: repo.full_name, private: repo.private, active: true })
      .onConflictDoUpdate({
        target: repositories.githubRepoId,
        set: { accountId, fullName: repo.full_name, private: repo.private, active: true },
      });
  }
}

async function deactivateRepos(repos: RepoRef[]) {
  for (const repo of repos) {
    await db().update(repositories).set({ active: false }).where(eq(repositories.githubRepoId, repo.id));
  }
}

async function handleInstallation(payload: InstallationPayload) {
  const { installation } = payload;
  if (!installation.account) return;
  switch (payload.action) {
    case "created":
    case "new_permissions_accepted":
    case "unsuspend": {
      const account = await upsertAccount(installation.account, installation.id, false);
      if (payload.repositories) await upsertRepos(account.id, payload.repositories);
      return;
    }
    case "suspend":
      await upsertAccount(installation.account, installation.id, true);
      return;
    case "deleted": {
      // Keep the account and its history so usage and billing survive a reinstall.
      const account = await upsertAccount(installation.account, null, false);
      await db().update(repositories).set({ active: false }).where(eq(repositories.accountId, account.id));
      return;
    }
  }
}

async function handleInstallationRepositories(payload: InstallationRepositoriesPayload) {
  if (!payload.installation.account) return;
  const account = await upsertAccount(payload.installation.account, payload.installation.id);
  await upsertRepos(account.id, payload.repositories_added);
  await deactivateRepos(payload.repositories_removed);
}

/** Returns the repo if reviews are allowed for it, creating rows missed by earlier webhooks. */
async function reviewableRepo(installationId: number, repo: PullRequestPayload["repository"]) {
  let [account] = await db().select().from(accounts).where(eq(accounts.installationId, installationId));
  if (!account) {
    account = await upsertAccount(repo.owner, installationId);
  }
  if (account.installationSuspended) return null;

  const [existing] = await db().select().from(repositories).where(eq(repositories.githubRepoId, repo.id));
  if (!existing) {
    await upsertRepos(account.id, [repo]);
    return { account, enabled: true };
  }
  if (!existing.active) {
    await db()
      .update(repositories)
      .set({ active: true })
      .where(and(eq(repositories.id, existing.id)));
  }
  return { account, enabled: existing.enabled };
}

async function handlePullRequest(payload: PullRequestPayload, deps: WebhookDeps) {
  if (!REVIEW_ACTIONS.has(payload.action) || !payload.installation) return;
  const target = await reviewableRepo(payload.installation.id, payload.repository);
  if (!target?.enabled) return;
  await deps.queue.enqueueReview({
    installationId: payload.installation.id,
    repoGithubId: payload.repository.id,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    prNumber: payload.number,
    trigger: "auto",
    full: false,
  });
}

async function handleIssueComment(payload: IssueCommentPayload, deps: WebhookDeps) {
  if (payload.action !== "created" || !payload.issue.pull_request || !payload.installation) return;
  if (payload.comment.user.type === "Bot") return;

  const { APP_URL } = env();
  const { slug } = requireGitHub();
  const command = parseCommand(payload.comment.body, slug);
  if (!command) return;

  const trusted =
    TRUSTED_ASSOCIATIONS.has(payload.comment.author_association) ||
    payload.comment.user.login === payload.issue.user.login;
  if (!trusted) return;

  const { owner, name } = { owner: payload.repository.owner.login, name: payload.repository.name };
  const port = await deps.portFor(payload.installation.id, owner, name);

  if (command.kind !== "review") {
    await port.createIssueComment(payload.issue.number, helpText(slug, APP_URL));
    return;
  }

  const target = await reviewableRepo(payload.installation.id, payload.repository);
  if (!target) return;
  if (!target.enabled) {
    await port.createIssueComment(
      payload.issue.number,
      `Reviews are turned off for this repository. An admin can enable them in the [dashboard](${APP_URL}/dashboard).`,
    );
    return;
  }

  await port.addCommentReaction(payload.comment.id, "eyes").catch(() => undefined);
  await deps.queue.enqueueReview({
    installationId: payload.installation.id,
    repoGithubId: payload.repository.id,
    owner,
    repo: name,
    prNumber: payload.issue.number,
    trigger: "command",
    full: command.full,
  });
}

export async function handleWebhook(event: string, payload: unknown, deps: WebhookDeps = defaultDeps()) {
  switch (event) {
    case "installation":
      return handleInstallation(payload as InstallationPayload);
    case "installation_repositories":
      return handleInstallationRepositories(payload as InstallationRepositoriesPayload);
    case "pull_request":
      return handlePullRequest(payload as PullRequestPayload, deps);
    case "issue_comment":
      return handleIssueComment(payload as IssueCommentPayload, deps);
    default:
      return;
  }
}
