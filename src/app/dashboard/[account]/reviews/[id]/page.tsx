import Link from "next/link";
import { notFound } from "next/navigation";
import { FindingSummary, StatusBadge } from "@/components/review-ui";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { requireAccount, reviewForAccount } from "@/lib/dashboard";

type Props = { params: Promise<{ account: string; id: string }> };

export const metadata = { title: "Review" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export default async function ReviewPage({ params }: Props) {
  const { account: login, id } = await params;
  const { account } = await requireAccount(login);
  const row = await reviewForAccount(account.id, id);
  if (!row) notFound();
  const { review, repoName } = row;
  const prUrl = `https://github.com/${repoName}/pull/${review.prNumber}`;
  const duration =
    review.startedAt && review.completedAt
      ? `${Math.max(1, Math.round((review.completedAt.getTime() - review.startedAt.getTime()) / 1000))}s`
      : "-";

  return (
    <>
      <Link
        href={`/dashboard/${account.login}`}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← {account.login}
      </Link>
      <PageHeader
        title={review.prTitle ?? `Pull request #${review.prNumber}`}
        description={`${repoName} #${review.prNumber}${review.prAuthor ? ` by ${review.prAuthor}` : ""}`}
        action={
          <ButtonLink href={prUrl} variant="secondary" target="_blank" rel="noreferrer">
            Open on GitHub
          </ButtonLink>
        }
      />
      <Card>
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Field label="Status">
            <StatusBadge review={review} />
          </Field>
          <Field label="Findings">
            <FindingSummary counts={review.findingCounts} />
          </Field>
          <Field label="Files reviewed">{review.filesReviewed}</Field>
          <Field label="Inline comments">{review.commentsPosted}</Field>
          <Field label="Trigger">{review.trigger === "command" ? "Comment command" : "Automatic"}</Field>
          <Field label="Commits">
            <code className="text-xs">
              {review.baseSha ? `${review.baseSha.slice(0, 7)}..` : ""}
              {review.headSha.slice(0, 7)}
            </code>
          </Field>
          <Field label="Duration">{duration}</Field>
          <Field label="Tokens">
            {(review.inputTokens + review.outputTokens).toLocaleString()}
            {review.model ? <span className="text-zinc-500"> · {review.model}</span> : null}
          </Field>
        </dl>
      </Card>

      {review.summary && (
        <Card className="mt-6">
          <h2 className="mb-2 font-semibold">Summary</h2>
          <p className="text-sm leading-6 whitespace-pre-line text-zinc-700 dark:text-zinc-300">{review.summary}</p>
        </Card>
      )}
      {review.skipReason && (
        <Card className="mt-6">
          <h2 className="mb-2 font-semibold">Why it was skipped</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {review.skipReason === "quota" ? "The monthly review quota was used up." : review.skipReason}
          </p>
        </Card>
      )}
      {review.error && (
        <Card className="mt-6 border-red-200 dark:border-red-900">
          <h2 className="mb-2 font-semibold text-red-700 dark:text-red-400">Error</h2>
          <pre className="overflow-x-auto text-xs whitespace-pre-wrap">{review.error}</pre>
        </Card>
      )}
    </>
  );
}
