"use client";

import { useMemo } from "react";
import {
  differenceInCalendarDays,
  startOfWeek,
  format,
  subDays,
} from "date-fns";

import type { Session } from "@/lib/types";

interface StreakStatsProps {
  sessions: Session[];
}

function computeWeeklyStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  const weekSet = new Set<string>();
  for (const session of sessions) {
    const week = startOfWeek(new Date(session.date), { weekStartsOn: 1 });
    weekSet.add(format(week, "yyyy-MM-dd"));
  }

  const sortedWeeks = [...weekSet].sort().reverse();
  if (sortedWeeks.length === 0) return 0;

  // Check if most recent session is this week or last week
  const currentWeek = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const lastWeek = format(
    startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );

  if (sortedWeeks[0] !== currentWeek && sortedWeeks[0] !== lastWeek) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedWeeks.length; i++) {
    const prevWeek = startOfWeek(
      subDays(new Date(sortedWeeks[i - 1]), 7),
      { weekStartsOn: 1 },
    );
    const expected = format(prevWeek, "yyyy-MM-dd");
    if (sortedWeeks[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function StreakStats({ sessions }: StreakStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();

    // Sessions in last 30 days
    const last30 = sessions.filter((s) => {
      const diff = differenceInCalendarDays(now, new Date(s.date));
      return diff >= 0 && diff <= 30;
    });

    // Sessions in prior 30 days (31-60)
    const prior30 = sessions.filter((s) => {
      const diff = differenceInCalendarDays(now, new Date(s.date));
      return diff > 30 && diff <= 60;
    });

    const weeklyFreq = last30.length / 4.3;
    const priorWeeklyFreq = prior30.length / 4.3;
    const trend =
      weeklyFreq > priorWeeklyFreq + 0.2
        ? "up"
        : weeklyFreq < priorWeeklyFreq - 0.2
          ? "down"
          : "flat";

    // Unique techniques this month
    const monthTechIds = new Set<string>();
    for (const s of last30) {
      for (const t of s.techniques) {
        monthTechIds.add(t.techniqueId);
      }
    }

    return {
      total: sessions.length,
      weeklyFreq: weeklyFreq.toFixed(1),
      trend,
      streak: computeWeeklyStreak(sessions),
      techniquesThisMonth: monthTechIds.size,
    };
  }, [sessions]);

  const trendArrow =
    stats.trend === "up" ? " ↑" : stats.trend === "down" ? " ↓" : "";

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Total sessions
        </p>
        <p className="mt-2 text-3xl font-semibold text-zinc-900">
          {stats.total}
        </p>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Per week
        </p>
        <p className="mt-2 text-3xl font-semibold text-zinc-900">
          {stats.weeklyFreq}
          <span
            className={`ml-1 text-lg ${
              stats.trend === "up"
                ? "text-emerald-500"
                : stats.trend === "down"
                  ? "text-red-400"
                  : "text-zinc-300"
            }`}
          >
            {trendArrow}
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-400">30 day avg</p>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Week streak
        </p>
        <p className="mt-2 text-3xl font-semibold text-zinc-900">
          {stats.streak}
        </p>
        <p className="mt-1 text-xs text-zinc-400">consecutive weeks</p>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Techniques
        </p>
        <p className="mt-2 text-3xl font-semibold text-zinc-900">
          {stats.techniquesThisMonth}
        </p>
        <p className="mt-1 text-xs text-zinc-400">this month</p>
      </div>
    </div>
  );
}
