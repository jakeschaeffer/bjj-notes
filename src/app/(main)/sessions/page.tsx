"use client";

import Link from "next/link";
import { format } from "date-fns";

import { useLocalSessions } from "@/hooks/use-local-sessions";

export default function SessionsPage() {
  const { sessions } = useLocalSessions();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Sessions
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Session history</h1>
          <p className="text-sm text-zinc-600">
            Review past training and see what you focused on.
          </p>
        </div>
        <Link
          href="/log"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Log session
        </Link>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">
            No sessions yet. Log your first session to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => {
            const techniquesCount = session.techniques.length;
            return (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {format(new Date(session.date), "MMM d, yyyy")}
                    </h2>
                    <p className="text-sm text-zinc-500">
                      {session.sessionType.replace(/-/g, " ")} - {session.giOrNogi}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">
                    {techniquesCount} technique{techniquesCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                  <span>Rounds: {session.sparringRounds}</span>
                  <span>Subs: +{session.subsAchieved} / -{session.subsReceived}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
