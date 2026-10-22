import Link from "next/link";
import type { ReactNode } from "react";

export const SETUP_CARD =
  "w-full max-w-sm rounded-xl bg-[var(--card-background)] p-6 shadow-lg space-y-4";
export const SETUP_INPUT =
  "w-full rounded-lg bg-[var(--background)] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--accent)]";
export const SETUP_BUTTON =
  "w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-black disabled:opacity-60";

/** The centered card every /setup screen sits in. */
export function SetupCard({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className={SETUP_CARD}>{children}</div>
    </main>
  );
}

export default function SetupNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SetupCard>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-gray-400">{children}</p>
      <Link href="/" className="block text-sm text-[var(--accent)]">
        Go to the dashboard
      </Link>
    </SetupCard>
  );
}
