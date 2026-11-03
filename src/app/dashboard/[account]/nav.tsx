import Link from "next/link";

export function AccountNav({ login, current }: { login: string; current: "overview" | "billing" }) {
  const tabs = [
    { id: "overview", label: "Overview", href: `/dashboard/${login}` },
    { id: "billing", label: "Billing", href: `/dashboard/${login}/billing` },
  ] as const;
  return (
    <nav className="mb-8 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            tab.id === current
              ? "border-brand-600 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
