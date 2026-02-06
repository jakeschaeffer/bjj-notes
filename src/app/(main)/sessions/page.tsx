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
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
            Sessions
          </p>
          <h1 className="text-display text-4xl">Session history</h1>
          <p className="text-sm text-[var(--muted)]">
            Review past training and see what you focused on.
          </p>
        </div>
        <Link
          href="/log"
          className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--background)] transition hover:translate-y-[-1px]"
        >
          Log session
        </Link>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_-40px_var(--shadow)]">
          <p className="text-sm text-[var(--muted)]">
            No sessions yet. Log your first session to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => {
            const techniquesCount = session.techniques.length;
            const roundCount = session.sparringRounds.length;
            const subsForCount = session.sparringRounds.reduce(
              (sum, round) =>
                sum +
                (typeof round.submissionsForCount === "number"
                  ? round.submissionsForCount
                  : round.submissionsFor.length),
              0,
            );
            const subsAgainstCount = session.sparringRounds.reduce(
              (sum, round) =>
                sum +
                (typeof round.submissionsAgainstCount === "number"
                  ? round.submissionsAgainstCount
                  : round.submissionsAgainst.length),
              0,
            );
            const useLegacy = roundCount === 0 && session.legacySparring;
            const displayRounds = useLegacy
              ? session.legacySparring?.rounds ?? 0
              : roundCount;
            const displaySubsFor = useLegacy
              ? session.legacySparring?.subsAchieved ?? 0
              : subsForCount;
            const displaySubsAgainst = useLegacy
              ? session.legacySparring?.subsReceived ?? 0
              : subsAgainstCount;
            return (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_24px_60px_-40px_var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {format(new Date(session.date), "MMM d, yyyy")}
                    </h2>
                    <p className="text-sm text-[var(--muted)]">
                      {session.sessionType.replace(/-/g, " ")} - {session.giOrNogi}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    {techniquesCount} technique{techniquesCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                  <span>Rounds: {displayRounds}</span>
                  <span>Subs: +{displaySubsFor} / -{displaySubsAgainst}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
