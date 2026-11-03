import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { currentUser, safeRedirectPath } from "@/lib/auth/session";
import { github } from "@/lib/env";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const destination = safeRedirectPath(next);
  if (await currentUser()) redirect(destination);

  if (!github()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Link href="/" className="inline-flex">
            <LogoMark className="size-10" />
          </Link>
          <h1 className="mt-5 text-xl font-semibold">Sign-in opens soon</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            CodeReviewer is not accepting sign-ins yet. Check back shortly, or read the{" "}
            <Link className="underline" href="/docs">
              documentation
            </Link>{" "}
            in the meantime.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="inline-flex">
          <LogoMark className="size-10" />
        </Link>
        <h1 className="mt-5 text-xl font-semibold">Sign in to CodeReviewer</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Use your GitHub account. We only read your profile and which installations you can access.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}
        <a
          href={`/api/auth/login?next=${encodeURIComponent(destination)}`}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Continue with GitHub
        </a>
        <p className="mt-6 text-xs text-zinc-500">
          By continuing you agree to the{" "}
          <Link className="underline" href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
