import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { accounts, memberships, users } from "@/db/schema";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { resetEnvForTesting } from "@/lib/env";
import { createTestDb } from "./helpers/db";

// The request's cookies and Clerk's view of it, set per test.
const jar = new Map<string, string>();
let claims: { userId: string | null; sessionId: string | null; orgId?: string | null; orgRole?: string | null };
const getUser = vi.fn(async (id: string) => ({
  id,
  username: "ada",
  firstName: "Ada",
  lastName: "Lovelace",
  imageUrl: "https://img.test/ada.png",
  primaryEmailAddress: { emailAddress: "ada@example.com" },
}));
const revokeSession = vi.fn(async (id: string) => ({ id }));
const auth = vi.fn(async () => claims);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => auth(),
  clerkClient: async () => ({ users: { getUser }, sessions: { revokeSession } }),
}));

const { currentViewer, isOrgAdmin } = await import("@/lib/auth/viewer");
const { accountsForViewer, viewerCanAccess, accountForViewer } = await import("@/lib/dashboard");
const { unlinkNexora } = await import("@/app/dashboard/actions");
const { POST: logout } = await import("@/app/api/auth/logout/route");
const { POST: checkout } = await import("@/app/api/billing/checkout/route");

const ORG = "org_2abcdefghijkl";
const OTHER_ORG = "org_2zyxwvutsrqpo";
let database: Db;

function enableClerk() {
  process.env.CLERK_SECRET_KEY = "sk_test_x";
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_x";
  resetEnvForTesting();
}

beforeEach(async () => {
  database = await createTestDb();
  jar.clear();
  claims = { userId: null, sessionId: null };
  auth.mockClear();
  getUser.mockClear();
  revokeSession.mockClear();
  enableClerk();
});
afterEach(() => {
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.CLERK_PUBLISHABLE_KEY;
  resetEnvForTesting();
});

async function seed() {
  const [linked, otherOrgs, unlinked] = await database
    .insert(accounts)
    .values([
      { githubAccountId: 10, login: "acme", installationId: 1, nexoraOrgId: ORG, installerGithubId: 42 },
      { githubAccountId: 11, login: "globex", installationId: 2, nexoraOrgId: OTHER_ORG },
      { githubAccountId: 12, login: "initech", installationId: 3 },
    ])
    .returning();
  return { linked: linked!, otherOrgs: otherOrgs!, unlinked: unlinked! };
}

async function signInWithGitHub(githubId: number, accountIds: string[] = []) {
  const [user] = await database
    .insert(users)
    .values({ githubId, login: `gh${githubId}` })
    .returning();
  for (const accountId of accountIds) await database.insert(memberships).values({ userId: user!.id, accountId });
  jar.set(SESSION_COOKIE, (await createSession(user!.id)).token);
  return user!;
}

function signInWithNexora(orgRole: string | null = "org:member", orgId: string | null = ORG) {
  claims = { userId: "user_clerk1", sessionId: "sess_1", orgId, orgRole };
}

async function expectRedirect(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
}

describe("who is signed in", () => {
  it("is nobody, and Clerk is never asked, while the Clerk keys are unset", async () => {
    delete process.env.CLERK_SECRET_KEY;
    resetEnvForTesting();
    signInWithNexora();
    expect(await currentViewer()).toBeNull();
    expect(auth).not.toHaveBeenCalled();
  });

  it("is the NEXORA user, created from the Clerk profile on the first visit only", async () => {
    signInWithNexora("org:admin");
    const viewer = await currentViewer();
    expect(viewer).toMatchObject({ kind: "nexora", orgId: ORG, orgRole: "org:admin", sessionId: "sess_1" });
    expect(viewer!.user).toMatchObject({
      clerkUserId: "user_clerk1",
      githubId: null,
      login: "ada",
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    await currentViewer();
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(await database.select().from(users)).toHaveLength(1);
  });

  it("prefers a GitHub session, so the sign-in linking needs never mixes the two", async () => {
    await signInWithGitHub(42);
    signInWithNexora("org:admin");
    expect((await currentViewer())?.kind).toBe("github");
    expect(auth).not.toHaveBeenCalled();
  });

  it("treats a request Clerk could not read as signed out", async () => {
    auth.mockRejectedValueOnce(new Error("clerkMiddleware not detected"));
    vi.spyOn(console, "warn").mockImplementationOnce(() => {});
    expect(await currentViewer()).toBeNull();
  });
});

describe("what a NEXORA viewer can see", () => {
  it("exactly the accounts linked to the active organisation", async () => {
    const { linked, otherOrgs, unlinked } = await seed();
    signInWithNexora();
    const viewer = (await currentViewer())!;
    expect((await accountsForViewer(viewer)).map((r) => r.account.login)).toEqual(["acme"]);
    expect(await viewerCanAccess(viewer, linked.id)).toBe(true);
    expect(await viewerCanAccess(viewer, otherOrgs.id)).toBe(false);
    expect(await viewerCanAccess(viewer, unlinked.id)).toBe(false);
    expect(await accountForViewer(viewer, "ACME")).toMatchObject({ id: linked.id });
    expect(await accountForViewer(viewer, "initech")).toBeNull();
  });

  it("nothing without an active organisation", async () => {
    await seed();
    signInWithNexora(null, null);
    const viewer = (await currentViewer())!;
    expect(await accountsForViewer(viewer)).toEqual([]);
    expect(isOrgAdmin(viewer)).toBe(false);
  });

  it("while a GitHub viewer still sees what GitHub lists for them, linked or not", async () => {
    const { linked, unlinked, otherOrgs } = await seed();
    await signInWithGitHub(7, [linked.id, unlinked.id]);
    const viewer = (await currentViewer())!;
    expect((await accountsForViewer(viewer)).map((r) => r.account.login)).toEqual(["acme", "initech"]);
    expect(await viewerCanAccess(viewer, otherOrgs.id)).toBe(false);
  });
});

describe("managing a linked account", () => {
  const form = (accountId: string) => {
    const data = new FormData();
    data.set("accountId", accountId);
    return data;
  };
  const linkedOrg = async () => (await database.select().from(accounts)).find((a) => a.login === "acme")!.nexoraOrgId;

  it("an organisation member cannot unlink", async () => {
    const { linked } = await seed();
    signInWithNexora("org:member");
    await expectRedirect(unlinkNexora(form(linked.id)));
    expect(await linkedOrg()).toBe(ORG);
  });

  it("an organisation admin can unlink", async () => {
    const { linked } = await seed();
    signInWithNexora("org:admin");
    await expectRedirect(unlinkNexora(form(linked.id)));
    expect(await linkedOrg()).toBeNull();
  });

  it("an admin of another organisation cannot touch it", async () => {
    const { linked } = await seed();
    signInWithNexora("org:admin", OTHER_ORG);
    await unlinkNexora(form(linked.id));
    expect(await linkedOrg()).toBe(ORG);
  });

  it("on GitHub, the installer can unlink and a collaborator cannot", async () => {
    const { linked } = await seed();
    await signInWithGitHub(7, [linked.id]);
    await expectRedirect(unlinkNexora(form(linked.id)));
    expect(await linkedOrg()).toBe(ORG);

    jar.clear();
    await signInWithGitHub(42, [linked.id]);
    await expectRedirect(unlinkNexora(form(linked.id)));
    expect(await linkedOrg()).toBeNull();
  });

  it("only an organisation admin reaches CodeReviewer's own checkout", async () => {
    const { linked } = await seed();
    signInWithNexora("org:member");
    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: form(linked.id),
    });
    expect((await checkout(request)).status).toBe(403);
  });
});

describe("signing out", () => {
  const request = () =>
    new Request("http://localhost:3000/api/auth/logout", { method: "POST" }) as unknown as Parameters<typeof logout>[0];

  it("ends the NEXORA session when there is no GitHub session", async () => {
    signInWithNexora();
    const response = await logout(Object.assign(request(), { cookies: { get: () => undefined } }));
    expect(response.status).toBe(303);
    expect(revokeSession).toHaveBeenCalledExactlyOnceWith("sess_1");
  });

  it("ends only CodeReviewer's GitHub session when there is one", async () => {
    await signInWithGitHub(42);
    signInWithNexora();
    const token = jar.get(SESSION_COOKIE)!;
    await logout(Object.assign(request(), { cookies: { get: () => ({ value: token }) } }));
    expect(revokeSession).not.toHaveBeenCalled();
  });
});
