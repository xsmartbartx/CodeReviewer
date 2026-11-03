import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="prose-docs mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-zinc-500">Last updated {updated}</p>
      {children}
    </article>
  );
}
