"use client";

import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";

import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";

function sortCounts(entries: Record<string, number>) {
  return Object.entries(entries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

export default function ProgressPage() {
  const { sessions } = useLocalSessions();
  const { index } = useUserTaxonomy();

  const stats = useMemo(() => {
    const positionCounts: Record<string, number> = {};
    const techniqueCounts: Record<string, number> = {};

    let techniqueTotal = 0;

    for (const session of sessions) {
      for (const technique of session.techniques) {
        techniqueTotal += 1;

        if (technique.positionId) {
          positionCounts[technique.positionId] =
            (positionCounts[technique.positionId] ?? 0) + 1;
        }

        if (technique.techniqueId) {
          techniqueCounts[technique.techniqueId] =
            (techniqueCounts[technique.techniqueId] ?? 0) + 1;
        }
      }
    }

    const last30Days = sessions.filter((session) => {
      const diff = differenceInCalendarDays(new Date(), new Date(session.date));
      return diff >= 0 && diff <= 30;
    }).length;

    return {
      totalSessions: sessions.length,
      techniqueTotal,
      last30Days,
      topPositions: sortCounts(positionCounts),
      topTechniques: sortCounts(techniqueCounts),
    };
  }, [sessions]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          Progress
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your overview</h1>
        <p className="text-sm text-zinc-600">
          Quick stats from logged sessions.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Total sessions
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {stats.totalSessions}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Techniques logged
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {stats.techniqueTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Last 30 days
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {stats.last30Days}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Top positions</h2>
          {stats.topPositions.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">No data yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm text-zinc-600">
              {stats.topPositions.map(([positionId, count]) => (
                <li key={positionId} className="flex items-center justify-between">
                  <span>{index.positionsById.get(positionId)?.name ?? positionId}</span>
                  <span className="font-semibold text-zinc-800">{count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Top techniques</h2>
          {stats.topTechniques.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">No data yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm text-zinc-600">
              {stats.topTechniques.map(([techniqueId, count]) => {
                const technique = index.techniquesById.get(techniqueId);
                return (
                  <li key={techniqueId} className="flex items-center justify-between">
                    <span>{technique?.name ?? techniqueId}</span>
                    <span className="font-semibold text-zinc-800">{count}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
