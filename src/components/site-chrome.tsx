import Link from "next/link";
import { Logo } from "./logo";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden gap-6 text-sm text-zinc-600 md:flex dark:text-zinc-400">
            <Link href="/#features" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Docs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">
            Sign in
          </ButtonLink>
          <ButtonLink href="/login?next=/dashboard">Start free</ButtonLink>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-zinc-600 dark:text-zinc-400">
            AI pull request reviews for GitHub, powered by Claude. Not affiliated with GitHub or Anthropic.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Product</h3>
          <ul className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-400">
            <li>
              <Link href="/#features" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Features
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Documentation
              </Link>
            </li>
            <li>
              <Link href="/docs#self-hosting" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Self-hosting
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Company</h3>
          <ul className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-400">
            <li>
              <Link href="/docs#security" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Security
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        © {year} CodeReviewer
      </div>
    </footer>
  );
}
