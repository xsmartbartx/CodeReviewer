import Image from "next/image";
import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, Meter, PageHeader } from "@/components/ui";
import { accountsForUser, requireUser } from "@/lib/dashboard";
import { installUrl } from "@/lib/github/app";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const rows = await accountsForUser(user.id);
  const install = installUrl();

  return (
    <>
      <PageHeader
        title="Accounts"
        description="GitHub accounts and organizations where CodeReviewer is installed and you have access."
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
