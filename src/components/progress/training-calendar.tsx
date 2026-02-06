"use client";

import { useMemo, useState } from "react";
import {
  startOfWeek,
  addDays,
  addWeeks,
  format,
  isSameDay,
  subWeeks,
  startOfDay,
} from "date-fns";
import Link from "next/link";

import type { Session } from "@/lib/types";

interface TrainingCalendarProps {
  sessions: Session[];
}

function getIntensity(sessions: Session[]): 0 | 1 | 2 | 3 {
  if (sessions.length === 0) return 0;
  const hasSparring = sessions.some((s) => s.sparringRounds.length > 0);
  if (sessions.length > 1) return 3;
  if (hasSparring) return 2;
  return 1;
}

const intensityClasses: Record<number, string> = {
  0: "bg-zinc-100",
  1: "bg-amber-200",
  2: "bg-amber-400",
  3: "bg-amber-600",
};

const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

export function TrainingCalendar({ sessions }: TrainingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const session of sessions) {
      const key = session.date;
      const list = map.get(key);
      if (list) {
        list.push(session);
      } else {
        map.set(key, [session]);
      }
    }
    return map;
  }, [sessions]);

  // Build 26-week (6 month) grid
  const { weeks, monthLabels } = useMemo(() => {
    const totalWeeks = 26;
    const today = startOfDay(new Date());
    const startWeek = startOfWeek(subWeeks(today, totalWeeks - 1), {
      weekStartsOn: 1,
    });

    const weeks: { date: Date; dateStr: string; sessions: Session[] }[][] = [];
    const monthLabels: { label: string; colStart: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = addWeeks(startWeek, w);
      const week: { date: Date; dateStr: string; sessions: Session[] }[] = [];

      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d);
        const dateStr = format(date, "yyyy-MM-dd");
        week.push({
          date,
          dateStr,
          sessions: sessionsByDate.get(dateStr) ?? [],
        });
      }

      const month = week[0].date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          label: format(week[0].date, "MMM"),
          colStart: w,
        });
        lastMonth = month;
      }

      weeks.push(week);
    }

    return { weeks, monthLabels };
  }, [sessionsByDate]);

  const selectedSessions = selectedDate
    ? sessionsByDate.get(selectedDate) ?? []
    : [];

  return (
    <div className="space-y-3">
      {/* Month labels */}
      <div className="flex pl-8">
        {monthLabels.map(({ label, colStart }, i) => {
          const nextStart =
            i < monthLabels.length - 1
              ? monthLabels[i + 1].colStart
              : weeks.length;
          const span = nextStart - colStart;
          return (
            <div
              key={`${label}-${colStart}`}
              className="text-xs font-medium text-zinc-400"
              style={{ width: `${(span / weeks.length) * 100}%` }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 pr-1.5">
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="flex h-3 w-6 items-center text-[10px] font-medium text-zinc-400"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => {
              const intensity = getIntensity(day.sessions);
              const isToday = isSameDay(day.date, new Date());
              const isFuture = day.date > new Date();
              const isSelected = selectedDate === day.dateStr;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  className={`h-3 w-3 rounded-sm transition-all ${
                    isFuture
                      ? "bg-transparent"
                      : intensityClasses[intensity]
                  } ${isToday ? "ring-1 ring-zinc-400" : ""} ${
                    isSelected ? "ring-2 ring-amber-600" : ""
                  }`}
                  onClick={() => {
                    if (isFuture) return;
                    setSelectedDate(
                      selectedDate === day.dateStr ? null : day.dateStr,
                    );
                  }}
                  disabled={isFuture}
                  title={
                    isFuture
                      ? ""
                      : `${format(day.date, "MMM d, yyyy")}${
                          day.sessions.length > 0
                            ? ` — ${day.sessions.length} session${day.sessions.length > 1 ? "s" : ""}`
                            : ""
                        }`
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 pl-8 text-[10px] text-zinc-400">
        <span>Less</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-sm ${intensityClasses[i]}`}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="rounded-xl border border-amber-100 bg-white p-4">
          <p className="text-sm font-semibold text-zinc-700">
            {format(new Date(selectedDate), "EEEE, MMM d, yyyy")}
          </p>
          {selectedSessions.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">No training logged.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {selectedSessions.map((session) => {
                const techCount = session.techniques.length;
                const roundCount = session.sparringRounds.length;
                const subsFor = session.sparringRounds.reduce(
                  (sum, r) => sum + r.submissionsForCount,
                  0,
                );
                const subsAgainst = session.sparringRounds.reduce(
                  (sum, r) => sum + r.submissionsAgainstCount,
                  0,
                );
                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-amber-50"
                  >
                    <span className="text-zinc-600">
                      {session.sessionType.replace(/-/g, " ")} &bull;{" "}
                      {session.giOrNogi}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {techCount > 0
                        ? `${techCount} technique${techCount !== 1 ? "s" : ""}`
                        : ""}
                      {techCount > 0 && roundCount > 0 ? " · " : ""}
                      {roundCount > 0
                        ? `${roundCount} round${roundCount !== 1 ? "s" : ""} (+${subsFor}/-${subsAgainst})`
                        : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
