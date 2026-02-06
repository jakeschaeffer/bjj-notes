"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";

import type { Session, Position } from "@/lib/types";
import type { buildTaxonomyIndex } from "@/lib/taxonomy";

type TaxonomyIndex = ReturnType<typeof buildTaxonomyIndex>;

interface PositionCoverageChartProps {
  sessions: Session[];
  index: TaxonomyIndex;
  onPositionClick?: (positionId: string) => void;
}

interface PositionCoverage {
  position: Position;
  count: number;
  depth: number;
  daysSinceLast: number;
}

function getBarColor(daysSince: number): string {
  if (daysSince <= 7) return "bg-amber-500";
  if (daysSince <= 30) return "bg-amber-300";
  if (daysSince <= 90) return "bg-amber-200";
  return "bg-zinc-300";
}

export function PositionCoverageChart({
  sessions,
  index,
  onPositionClick,
}: PositionCoverageChartProps) {
  const [expanded, setExpanded] = useState(false);

  const coverageData = useMemo(() => {
    // Count sessions per position and track last seen date
    const counts = new Map<string, number>();
    const lastSeen = new Map<string, Date>();
    const now = new Date();

    for (const session of sessions) {
      const sessionDate = new Date(session.date);

      for (const technique of session.techniques) {
        if (technique.positionId) {
          counts.set(
            technique.positionId,
            (counts.get(technique.positionId) ?? 0) + 1,
          );
          const prev = lastSeen.get(technique.positionId);
          if (!prev || sessionDate > prev) {
            lastSeen.set(technique.positionId, sessionDate);
          }
        }
      }

      for (const note of session.positionNotes) {
        counts.set(
          note.positionId,
          (counts.get(note.positionId) ?? 0) + 1,
        );
        const prev = lastSeen.get(note.positionId);
        if (!prev || sessionDate > prev) {
          lastSeen.set(note.positionId, sessionDate);
        }
      }
    }

    // Build tree-ordered list with depths
    const result: PositionCoverage[] = [];

    function walk(parentId: string | null, depth: number) {
      const children = index.getChildren(parentId);
      for (const child of children) {
        const count = counts.get(child.id) ?? 0;
        // Include positions that have counts, or whose children have counts
        const childHasData = hasDescendantData(child.id);
        if (count > 0 || childHasData) {
          const last = lastSeen.get(child.id);
          result.push({
            position: child,
            count,
            depth,
            daysSinceLast: last
              ? differenceInCalendarDays(now, last)
              : 999,
          });
          walk(child.id, depth + 1);
        }
      }
    }

    function hasDescendantData(positionId: string): boolean {
      const children = index.getChildren(positionId);
      for (const child of children) {
        if ((counts.get(child.id) ?? 0) > 0) return true;
        if (hasDescendantData(child.id)) return true;
      }
      return false;
    }

    walk(null, 0);
    return result;
  }, [sessions, index]);

  const maxCount = useMemo(
    () => Math.max(1, ...coverageData.map((d) => d.count)),
    [coverageData],
  );

  const displayData = expanded ? coverageData : coverageData.slice(0, 15);

  if (coverageData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Position coverage</h2>

      <div className="space-y-1">
        {displayData.map((item) => (
          <button
            key={item.position.id}
            type="button"
            onClick={() => onPositionClick?.(item.position.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-amber-50"
            style={{ paddingLeft: `${8 + item.depth * 16}px` }}
          >
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
              {item.position.name}
            </span>

            <div className="flex h-3 w-24 items-center sm:w-32">
              {item.count > 0 && (
                <div
                  className={`h-full rounded-full ${getBarColor(item.daysSinceLast)}`}
                  style={{
                    width: `${Math.max(8, (item.count / maxCount) * 100)}%`,
                  }}
                />
              )}
            </div>

            <span className="w-8 text-right text-xs font-semibold text-zinc-400">
              {item.count > 0 ? item.count : ""}
            </span>
          </button>
        ))}
      </div>

      {coverageData.length > 15 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-amber-600"
        >
          {expanded
            ? "Show less"
            : `Show all ${coverageData.length} positions`}
        </button>
      )}
    </div>
  );
}
