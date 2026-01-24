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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white text-zinc-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            BJJ Notes
          </p>
          <AccountActions />
        </header>
        <header className="space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Train. Log. Improve.
          </h1>
          <p className="max-w-xl text-base text-zinc-600 sm:text-lg">
            Capture sessions fast, then find techniques and patterns when it
            matters most.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/log"
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Log a session
            </Link>
            <Link
              href="/techniques"
              className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-100"
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
              className="group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {action.title}
                </h2>
                <span className="text-sm text-zinc-400 transition group-hover:text-zinc-600">
                  -&gt;
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                {action.description}
              </p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
