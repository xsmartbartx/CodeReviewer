import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <nav className="hidden gap-4 text-sm text-zinc-600 sm:flex dark:text-zinc-400">
              <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Accounts
              </Link>
              <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user.avatarUrl && (
              <Image src={user.avatarUrl} alt="" width={28} height={28} className="rounded-full" unoptimized />
            )}
            <span className="hidden text-sm font-medium sm:inline">{user.login}</span>
            <form action="/api/auth/logout" method="post">
              <button className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
