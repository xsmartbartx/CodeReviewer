"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, repositories } from "@/db/schema";
import { currentViewer, isOrgAdmin } from "@/lib/auth/viewer";
import { viewerCanAccess } from "@/lib/dashboard";
import { githubApp } from "@/lib/github/app";
import { canLink, unlink } from "@/lib/nexora/link";

export async function setRepositoryEnabled(formData: FormData) {
  const viewer = await currentViewer();
  const repoId = String(formData.get("repoId") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!viewer || !/^[0-9a-f-]{36}$/i.test(repoId)) return;

  const [repo] = await db().select().from(repositories).where(eq(repositories.id, repoId));
  if (!repo || !(await viewerCanAccess(viewer, repo.accountId))) return;

  await db().update(repositories).set({ enabled }).where(eq(repositories.id, repo.id));
  revalidatePath("/dashboard", "layout");
}

/** Re-read the installation's repositories from GitHub, in case webhooks were missed. */
export async function syncRepositories(formData: FormData) {
  const viewer = await currentViewer();
  const accountId = String(formData.get("accountId") ?? "");
  if (!viewer || !(await viewerCanAccess(viewer, accountId))) return;

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

/**
 * Stop billing an account through its NEXORA organisation: whoever may link it (canLink), or an
 * admin of the organisation it is linked to.
 */
export async function unlinkNexora(formData: FormData) {
  const viewer = await currentViewer();
  const accountId = String(formData.get("accountId") ?? "");
  if (!viewer || !(await viewerCanAccess(viewer, accountId))) return;

  const [account] = await db().select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return;
  const allowed = viewer.kind === "github" ? canLink(viewer.user, account) : isOrgAdmin(viewer);
  const done = allowed && (await unlink(account, viewer.user));
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/${account.login}/billing?link=${done ? "removed" : "forbidden"}`);
}
