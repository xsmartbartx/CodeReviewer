import { eq, notInArray, and } from "drizzle-orm";
import { Octokit } from "octokit";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { env, requireGitHub } from "@/lib/env";
import { upsertAccount } from "@/lib/github/handlers";

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireGitHub().clientId,
    redirect_uri: `${env().APP_URL}/api/auth/callback`,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireGitHub().clientId,
      client_secret: requireGitHub().clientSecret,
      code,
      redirect_uri: `${env().APP_URL}/api/auth/callback`,
    }),
  });
  const data = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? "GitHub did not return an access token.");
  }
  return data.access_token;
}

/**
 * Upsert the user and replace their memberships with the installations GitHub says
 * they can access. The user token is used once here and never stored.
 */
export async function syncUserFromToken(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken });
  const { data: profile } = await octokit.rest.users.getAuthenticated();
  const installations = await octokit.paginate(octokit.rest.apps.listInstallationsForAuthenticatedUser, {
    per_page: 100,
  });

  const values = {
    githubId: profile.id,
    login: profile.login,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
  };
  const [user] = await db()
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.githubId, set: values })
    .returning();

  const accountIds: string[] = [];
  for (const installation of installations) {
    const owner = installation.account;
    if (!owner || !("login" in owner)) continue;
    const account = await upsertAccount(
      { id: owner.id, login: owner.login, type: owner.type, avatar_url: owner.avatar_url },
      installation.id,
      Boolean(installation.suspended_at),
    );
    accountIds.push(account.id);
    await db().insert(memberships).values({ userId: user!.id, accountId: account.id }).onConflictDoNothing();
  }

  await db()
    .delete(memberships)
    .where(
      accountIds.length
        ? and(eq(memberships.userId, user!.id), notInArray(memberships.accountId, accountIds))
        : eq(memberships.userId, user!.id),
    );
  return user!;
}
