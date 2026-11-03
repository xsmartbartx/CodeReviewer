import Link from "next/link";
import { FindingSummary, StatusBadge, timeAgo } from "@/components/review-ui";
import { Badge, Button, ButtonLink, Card, EmptyState, Meter, PageHeader } from "@/components/ui";
import { effectivePlan } from "@/lib/billing/plans";
import { recentReviews, reposForAccount, requireAccount } from "@/lib/dashboard";
import { billingEnabled, env } from "@/lib/env";
import { installUrl } from "@/lib/github/app";
import { reviewsUsed } from "@/lib/usage";
import { setRepositoryEnabled, syncRepositories } from "../actions";
import { AccountNav } from "./nav";

type Props = { params: Promise<{ account: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: (await params).account };
}

export default async function AccountPage({ params }: Props) {
  const { account } = await requireAccount((await params).account);
  const [repos, reviews, used] = await Promise.all([
    reposForAccount(account.id),
    recentReviews(account.id),
    reviewsUsed(account.id),
  ]);
  const plan = effectivePlan(account, billingEnabled());
  const enabledCount = repos.filter((r) => r.enabled).length;

  return (
    <>
      <PageHeader
        title={account.login}
        description={`${plan.name} plan · ${enabledCount} of ${repos.length} repositories reviewed`}
        action={
          <ButtonLink href={installUrl()} variant="secondary">
            Manage repositories on GitHub
          </ButtonLink>
        }
      />
      <AccountNav login={account.login} current="overview" />

      {!account.installationId && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          The GitHub App was uninstalled from this account.{" "}
          <Link className="underline" href={installUrl()}>
            Reinstall it
          </Link>{" "}
          to resume reviews.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <Meter value={used} max={plan.reviewsPerMonth} label="Reviews this month" />
          <p className="mt-3 text-xs text-zinc-500">
            Resets on the 1st of each month (UTC). Skipped and failed reviews do not count.
          </p>
          {billingEnabled() && plan.id !== "team" && (
            <ButtonLink href={`/dashboard/${account.login}/billing`} className="mt-4 w-full">
              Upgrade
            </ButtonLink>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Repositories</h2>
            <form action={syncRepositories}>
              <input type="hidden" name="accountId" value={account.id} />
              <Button variant="ghost" className="px-2 py-1 text-xs">
                Sync from GitHub
              </Button>
            </form>
          </div>
          {repos.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No repositories yet. Choose repositories in the GitHub App settings, then sync.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {repos.map((repo) => (
                <li key={repo.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{repo.fullName}</span>
                    {repo.private && <Badge>Private</Badge>}
                  </div>
                  <form action={setRepositoryEnabled}>
                    <input type="hidden" name="repoId" value={repo.id} />
                    <input type="hidden" name="enabled" value={String(!repo.enabled)} />
                    <button
                      role="switch"
                      aria-checked={repo.enabled}
                      aria-label={`${repo.enabled ? "Disable" : "Enable"} reviews for ${repo.fullName}`}
                      className={`relative h-5 w-9 rounded-full transition ${repo.enabled ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition ${repo.enabled ? "left-4.5" : "left-0.5"}`}
                      />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mt-10 mb-4 font-semibold">Recent reviews</h2>
      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet">
          Open a pull request in an enabled repository, or comment <code>@{env().GITHUB_APP_SLUG} review</code> on an
          existing one.
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 uppercase dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Pull request</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Findings</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {reviews.map(({ review, repoName }) => (
                <tr key={review.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="max-w-md px-4 py-3">
                    <Link href={`/dashboard/${account.login}/reviews/${review.id}`} className="block">
                      <span className="block truncate font-medium">
                        {review.prTitle ?? `Pull request #${review.prNumber}`}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {repoName} #{review.prNumber}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge review={review} />
                  </td>
                  <td className="px-4 py-3">
                    <FindingSummary counts={review.findingCounts} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{timeAgo(review.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
