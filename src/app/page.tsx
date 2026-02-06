import Link from "next/link";

import { AccountActions } from "@/components/auth/account-actions";

export default function Home() {
  const actions = [
    {
      href: "/log",
      title: "Log Class",
      description: "One focus. Two numbers. Done.",
    },
    {
      href: "/sessions",
      title: "Session Archive",
      description: "Scan patterns without the noise.",
    },
    {
      href: "/techniques",
      title: "Technique Map",
      description: "Browse positions and sequences.",
    },
    {
      href: "/progress",
      title: "Progress Pulse",
      description: "Understand the months, not just the day.",
    },
  ];

  return (
    <div className="grain-overlay relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff,transparent_55%),linear-gradient(160deg,var(--surface-3),var(--background))] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(26,20,16,0.18),transparent)] blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-display text-2xl">BJJ</span>
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
              Notes
            </span>
          </div>
          <AccountActions />
        </header>

        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--muted)]">
              Training Log
            </p>
            <h1 className="text-display text-5xl leading-[0.9] sm:text-6xl lg:text-7xl">
              Log the class.
              <br />
              Leave the mat.
            </h1>
            <p className="max-w-xl text-base text-[var(--muted-strong)] sm:text-lg">
              A radical, stripped-down training log. One focus. Two numbers.
              You’re done before your belt is dry.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/log"
                className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--background)] transition hover:translate-y-[-1px]"
              >
                Start log
              </Link>
              <Link
                href="/sessions"
                className="rounded-full border border-[var(--line-strong)] px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
              >
                View archive
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              <span>1 focus</span>
              <span>2 counts</span>
              <span>0 fluff</span>
            </div>
          </div>

          <div className="relative rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_28px_70px_-48px_var(--shadow)]">
            <div className="absolute -top-5 left-6 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
              Quick log
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                <span>Today</span>
                <span>Gi class</span>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold">Knee Shield Half</p>
                <p className="text-xs text-[var(--muted)]">
                  One position, one technique. That’s it.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                    You tapped
                  </p>
                  <p className="text-3xl font-semibold">3</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                    You got tapped
                  </p>
                  <p className="text-3xl font-semibold">1</p>
                </div>
              </div>
              <Link
                href="/log"
                className="accent-glow inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px]"
              >
                Log this class
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_50px_-40px_var(--shadow)] transition hover:-translate-y-1 hover:border-[var(--line-strong)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                  {action.title}
                </h2>
                <span className="text-xs text-[var(--muted)] transition group-hover:text-[var(--foreground)]">
                  ↗
                </span>
              </div>
              <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
                {action.description}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {`0${index + 1}`}
              </p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
