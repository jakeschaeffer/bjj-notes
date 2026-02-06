"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";

import type { Session, Technique } from "@/lib/types";
import type { buildTaxonomyIndex } from "@/lib/taxonomy";

type TaxonomyIndex = ReturnType<typeof buildTaxonomyIndex>;

interface TechniqueRecencyListProps {
  sessions: Session[];
  index: TaxonomyIndex;
}

type SortMode = "recency" | "frequency" | "alpha";

interface TechniqueRecency {
  technique: Technique;
  totalCount: number;
  daysSinceLastDrilled: number;
  lastDate: string;
  /** last 5 session dates (most recent first) */
  recentSessionDates: string[];
}

function getRecencyColor(days: number): string {
  if (days <= 7) return "bg-amber-500";
  if (days <= 30) return "bg-amber-300";
  if (days <= 90) return "bg-amber-100";
  return "bg-zinc-200";
}

export function TechniqueRecencyList({
  sessions,
  index,
}: TechniqueRecencyListProps) {
  const [sortMode, setSortMode] = useState<SortMode>("recency");
  const [expanded, setExpanded] = useState(false);

  const techniqueRecencyData = useMemo(() => {
    const map = new Map<
      string,
      { count: number; dates: string[] }
    >();

    // Process sessions oldest-to-newest so we can slice last 5 easily
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    for (const session of sorted) {
      for (const technique of session.techniques) {
        const entry = map.get(technique.techniqueId);
        if (entry) {
          entry.count++;
          if (!entry.dates.includes(session.date)) {
            entry.dates.push(session.date);
          }
        } else {
          map.set(technique.techniqueId, {
            count: 1,
            dates: [session.date],
          });
        }
      }
    }

    const now = new Date();
    const result: TechniqueRecency[] = [];

    for (const [techniqueId, data] of map) {
      const technique = index.techniquesById.get(techniqueId);
      if (!technique) continue;

      const recentDates = data.dates.slice(0, 5);
      const lastDate = recentDates[0];
      const daysSince = differenceInCalendarDays(now, new Date(lastDate));

      result.push({
        technique,
        totalCount: data.count,
        daysSinceLastDrilled: daysSince,
        lastDate,
        recentSessionDates: recentDates,
      });
    }

    return result;
  }, [sessions, index.techniquesById]);

  const sortedData = useMemo(() => {
    const data = [...techniqueRecencyData];
    switch (sortMode) {
      case "recency":
        data.sort((a, b) => a.daysSinceLastDrilled - b.daysSinceLastDrilled);
        break;
      case "frequency":
        data.sort((a, b) => b.totalCount - a.totalCount);
        break;
      case "alpha":
        data.sort((a, b) => a.technique.name.localeCompare(b.technique.name));
        break;
    }
    return data;
  }, [techniqueRecencyData, sortMode]);

  const displayData = expanded ? sortedData : sortedData.slice(0, 10);

  if (sortedData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Technique recency</h2>
        <div className="flex gap-1">
          {(["recency", "frequency", "alpha"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                sortMode === mode
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {mode === "alpha"
                ? "A-Z"
                : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {displayData.map((item) => (
          <div
            key={item.technique.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-amber-50"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700">
              {item.technique.name}
            </span>

            {/* Recency dots — last 5 sessions */}
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${
                    i < item.recentSessionDates.length
                      ? getRecencyColor(item.daysSinceLastDrilled)
                      : "bg-zinc-100"
                  }`}
                />
              ))}
            </div>

            <span className="w-16 text-right text-xs text-zinc-400">
              {item.daysSinceLastDrilled === 0
                ? "Today"
                : item.daysSinceLastDrilled === 1
                  ? "1 day"
                  : item.daysSinceLastDrilled < 7
                    ? `${item.daysSinceLastDrilled}d`
                    : item.daysSinceLastDrilled < 30
                      ? `${Math.floor(item.daysSinceLastDrilled / 7)}w`
                      : `${Math.floor(item.daysSinceLastDrilled / 30)}mo`}
            </span>

            <span className="w-10 text-right text-xs font-semibold text-zinc-500">
              {item.totalCount}x
            </span>
          </div>
        ))}
      </div>

      {sortedData.length > 10 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-amber-600"
        >
          {expanded
            ? "Show less"
            : `Show all ${sortedData.length} techniques`}
        </button>
      )}
    </div>
  );
}
