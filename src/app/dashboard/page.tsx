import Image from "next/image";
import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, Meter, PageHeader } from "@/components/ui";
import { accountsForViewer, requireViewer } from "@/lib/dashboard";
import { clerk } from "@/lib/env";
import { installUrl } from "@/lib/github/app";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const rows = await accountsForViewer(viewer);
  const install = installUrl();

  if (viewer.kind === "nexora" && rows.length === 0) {
    const accountUrl = clerk()?.accountUrl ?? "";
    return (
      <>
        <PageHeader title="Accounts" description="GitHub accounts linked to your NEXORA organisation." />
        {viewer.orgId ? (
          <EmptyState title="No GitHub accounts are linked to this organisation yet">
            <p>
              Install CodeReviewer on GitHub, then link the account to this organisation from its Billing page. Linking
              needs a GitHub sign-in by the account&apos;s owner or by whoever installed the app, and an organisation
              admin&apos;s confirmation in NEXORA Console.
            </p>
            <ButtonLink href={install} className="mt-6">
              Install the GitHub App
            </ButtonLink>
          </EmptyState>
        ) : (
          <EmptyState title="Choose an organisation">
            <p>CodeReviewer shows the GitHub accounts linked to your active NEXORA organisation.</p>
            <a className="text-brand-600 mt-4 inline-block underline" href={`${accountUrl}/organizations`}>
              Choose or create an organisation
            </a>
          </EmptyState>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description={
          viewer.kind === "nexora"
            ? "GitHub accounts linked to your NEXORA organisation."
            : "GitHub accounts and organizations where CodeReviewer is installed and you have access."
        }
        action={
          <ButtonLink href={install} variant="secondary">
            Add an organization
          </ButtonLink>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="Install CodeReviewer on GitHub">
          <p>Install the GitHub App on your account or organization and pick the repositories to review.</p>
          <p className="mt-1">
            Already installed?{" "}
            <Link className="text-brand-600 underline" href="/api/auth/login">
              Sign in again
            </Link>{" "}
            to refresh your access.
          </p>
          <ButtonLink href={install} className="mt-6">
            Install the GitHub App
          </ButtonLink>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ account, plan, used }) => (
            <Link key={account.id} href={`/dashboard/${account.login}`} className="group">
              <Card className="group-hover:border-brand-400 transition">
                <div className="flex items-center gap-3">
                  {account.avatarUrl && (
                    <Image src={account.avatarUrl} alt="" width={40} height={40} className="rounded-lg" unoptimized />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{account.login}</div>
                    <div className="text-xs text-zinc-500">{account.type}</div>
                  </div>
                  <Badge tone={plan.id === "free" ? "neutral" : "brand"}>{plan.name}</Badge>
                  {account.installationSuspended && <Badge tone="amber">Suspended</Badge>}
                  {!account.installationId && <Badge tone="red">Uninstalled</Badge>}
                </div>
                <div className="mt-5">
                  <Meter value={used} max={plan.reviewsPerMonth} label="Reviews this month" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
