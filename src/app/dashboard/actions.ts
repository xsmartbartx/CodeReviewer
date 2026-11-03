"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, repositories } from "@/db/schema";
import { currentUser } from "@/lib/auth/session";
import { userCanAccess } from "@/lib/dashboard";
import { githubApp } from "@/lib/github/app";

export async function setRepositoryEnabled(formData: FormData) {
  const user = await currentUser();
  const repoId = String(formData.get("repoId") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!user || !repoId) return;

  const [repo] = await db().select().from(repositories).where(eq(repositories.id, repoId));
  if (!repo || !(await userCanAccess(user.id, repo.accountId))) return;

  await db().update(repositories).set({ enabled }).where(eq(repositories.id, repo.id));
  revalidatePath("/dashboard", "layout");
}

/** Re-read the installation's repositories from GitHub, in case webhooks were missed. */
export async function syncRepositories(formData: FormData) {
  const user = await currentUser();
  const accountId = String(formData.get("accountId") ?? "");
  if (!user || !accountId || !(await userCanAccess(user.id, accountId))) return;

  const [account] = await db().select().from(accounts).where(eq(accounts.id, accountId));
  if (!account?.installationId) return;

  const octokit = await githubApp().getInstallationOctokit(account.installationId);
  const repos = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, { per_page: 100 });
  const seen = new Set<number>();
  for (const repo of repos) {
    seen.add(repo.id);
    await db()
      .insert(repositories)
      .values({ accountId, githubRepoId: repo.id, fullName: repo.full_name, private: repo.private })
      .onConflictDoUpdate({
        target: repositories.githubRepoId,
        set: { accountId, fullName: repo.full_name, private: repo.private, active: true },
      });
  }
  const existing = await db().select().from(repositories).where(eq(repositories.accountId, accountId));
  for (const repo of existing) {
    if (!seen.has(repo.githubRepoId) && repo.active) {
      await db().update(repositories).set({ active: false }).where(eq(repositories.id, repo.id));
    }
  }
  revalidatePath("/dashboard", "layout");
}
