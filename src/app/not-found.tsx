import { LogoMark } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <LogoMark className="size-10" />
      <h1 className="mt-6 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">The page does not exist, or you do not have access to it.</p>
      <ButtonLink href="/" className="mt-6">
        Back home
      </ButtonLink>
    </main>
  );
}
