"use client";

import { useMemo } from "react";
import { startOfWeek, format } from "date-fns";

import type { Session } from "@/lib/types";

interface SparringTimelineProps {
  sessions: Session[];
}

interface WeekData {
  weekLabel: string;
  subsFor: number;
  subsAgainst: number;
  rounds: number;
}

export function SparringTimeline({ sessions }: SparringTimelineProps) {
  const weeklyData = useMemo(() => {
    const weekMap = new Map<string, WeekData>();

    for (const session of sessions) {
      if (session.sparringRounds.length === 0 && !session.legacySparring)
        continue;

      const weekStart = startOfWeek(new Date(session.date), {
        weekStartsOn: 1,
      });
      const weekKey = format(weekStart, "yyyy-MM-dd");
      const weekLabel = format(weekStart, "MMM d");

      const existing = weekMap.get(weekKey) ?? {
        weekLabel,
        subsFor: 0,
        subsAgainst: 0,
        rounds: 0,
      };

      if (session.sparringRounds.length > 0) {
        for (const round of session.sparringRounds) {
          existing.subsFor += round.submissionsForCount;
          existing.subsAgainst += round.submissionsAgainstCount;
          existing.rounds++;
        }
      } else if (session.legacySparring) {
        existing.subsFor += session.legacySparring.subsAchieved;
        existing.subsAgainst += session.legacySparring.subsReceived;
        existing.rounds += session.legacySparring.rounds;
      }

      weekMap.set(weekKey, existing);
    }

    return [...weekMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, data]) => data)
      .slice(-12); // Last 12 weeks
  }, [sessions]);

  const totalRounds = weeklyData.reduce((sum, w) => sum + w.rounds, 0);
  const totalSubsFor = weeklyData.reduce((sum, w) => sum + w.subsFor, 0);
  const totalSubsAgainst = weeklyData.reduce(
    (sum, w) => sum + w.subsAgainst,
    0,
  );
  const maxSubs = Math.max(
    1,
    ...weeklyData.map((w) => Math.max(w.subsFor, w.subsAgainst)),
  );

  if (weeklyData.length === 0) {
    return null;
  }

  const subRate =
    totalRounds > 0 ? (totalSubsFor / totalRounds).toFixed(1) : "0";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Sparring</h2>
        <div className="flex gap-4 text-xs text-zinc-400">
          <span>{totalRounds} rounds</span>
          <span>{subRate} subs/round</span>
        </div>
      </div>

      <div className="flex items-end gap-1" style={{ height: "96px" }}>
        {weeklyData.map((week, i) => {
          const forHeight = Math.max(4, (week.subsFor / maxSubs) * 80);
          const againstHeight = Math.max(
            week.subsAgainst > 0 ? 4 : 0,
            (week.subsAgainst / maxSubs) * 80,
          );

          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-end gap-0.5"
              title={`${week.weekLabel}: +${week.subsFor}/-${week.subsAgainst} (${week.rounds} rounds)`}
            >
              <div
                className="w-full max-w-[24px] rounded-t bg-amber-400"
                style={{ height: `${forHeight}px` }}
              />
              {week.subsAgainst > 0 && (
                <div
                  className="w-full max-w-[24px] rounded-b bg-zinc-300"
                  style={{ height: `${againstHeight}px` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Week labels */}
      <div className="flex gap-1">
        {weeklyData.map((week, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[9px] text-zinc-400"
          >
            {i % 2 === 0 || weeklyData.length <= 6
              ? week.weekLabel
              : ""}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
          Subs achieved (+{totalSubsFor})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-300" />
          Subs received (-{totalSubsAgainst})
        </span>
      </div>
    </div>
  );
}
