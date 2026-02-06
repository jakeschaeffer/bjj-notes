import Link from "next/link";

import { AccountActions } from "@/components/auth/account-actions";

export default function Home() {
  const actions = [
    {
      href: "/log",
      title: "Log Session",
      description: "Fast entry for techniques, sparring, and notes.",
    },
    {
      href: "/sessions",
      title: "Session History",
      description: "Review past training sessions and trends.",
    },
    {
      href: "/techniques",
      title: "Technique Library",
      description: "Browse the taxonomy or search by name.",
    },
    {
      href: "/progress",
      title: "Progress",
      description: "See simple stats from your recent training.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--gg-bg)] text-[var(--gg-text)] gg-mat-grid">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.4em] text-[var(--gg-text-muted)]">
            Grapple Graph
          </p>
          <AccountActions />
        </header>
        <header className="space-y-5">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Train. Log. Improve.
          </h1>
          <p className="max-w-xl text-base text-[var(--gg-text-muted)] sm:text-lg">
            Capture sessions fast, then find techniques and patterns when it
            matters most.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/log"
              className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Log a session
            </Link>
            <Link
              href="/techniques"
              className="rounded-full border border-[var(--gg-border)] px-5 py-2.5 text-sm font-semibold text-[var(--gg-text)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)]"
            >
              Browse techniques
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)] p-5 shadow-[0_16px_32px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-[var(--gg-signal)]"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-[var(--gg-text)]">
                  {action.title}
                </h2>
                <span className="text-sm text-[var(--gg-text-muted)] transition group-hover:text-[var(--gg-signal)]">
                  -&gt;
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--gg-text-muted)]">
                {action.description}
              </p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
