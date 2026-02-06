"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";

import type { Session, Position } from "@/lib/types";
import type { buildTaxonomyIndex } from "@/lib/taxonomy";

type TaxonomyIndex = ReturnType<typeof buildTaxonomyIndex>;

interface KnowledgeCardProps {
  position: Position;
  sessions: Session[];
  index: TaxonomyIndex;
  personalNotes: string;
  onEditNotes?: () => void;
}

export function KnowledgeCard({
  position,
  sessions,
  index,
  personalNotes,
  onEditNotes,
}: KnowledgeCardProps) {
  const data = useMemo(() => {
    let sessionCount = 0;
    const techniqueCounts = new Map<string, number>();
    const recentNotes: { date: string; notes: string; sessionId: string }[] =
      [];

    for (const session of sessions) {
      let relevant = false;

      for (const technique of session.techniques) {
        if (technique.positionId === position.id) {
          relevant = true;
          techniqueCounts.set(
            technique.techniqueId,
            (techniqueCounts.get(technique.techniqueId) ?? 0) + 1,
          );
          if (technique.notes.trim()) {
            recentNotes.push({
              date: session.date,
              notes: technique.notes.trim(),
              sessionId: session.id,
            });
          }
        }
      }

      for (const note of session.positionNotes) {
        if (note.positionId === position.id) {
          relevant = true;
          if (note.notes.trim()) {
            recentNotes.push({
              date: session.date,
              notes: note.notes.trim(),
              sessionId: session.id,
            });
          }
        }
      }

      if (relevant) sessionCount++;
    }

    // Sort notes by date descending, take top 3
    recentNotes.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Top techniques by count
    const topTechniques = [...techniqueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        name: index.techniquesById.get(id)?.name ?? id,
        count,
      }));

    return {
      sessionCount,
      techniqueCount: techniqueCounts.size,
      topTechniques,
      recentNotes: recentNotes.slice(0, 3),
    };
  }, [position.id, sessions, index]);

  return (
    <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            {position.name}
          </h3>
          <p className="text-xs text-zinc-400">
            {data.sessionCount} session{data.sessionCount !== 1 ? "s" : ""} ·{" "}
            {data.techniqueCount} technique
            {data.techniqueCount !== 1 ? "s" : ""}
          </p>
        </div>
        {onEditNotes && (
          <button
            type="button"
            onClick={onEditNotes}
            className="text-xs font-semibold text-amber-600"
          >
            Edit notes
          </button>
        )}
      </div>

      {personalNotes && (
        <p className="mt-3 text-sm text-zinc-600 italic">
          &ldquo;{personalNotes}&rdquo;
        </p>
      )}

      {data.topTechniques.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.topTechniques.map((t) => (
            <span
              key={t.name}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
            >
              {t.name} ({t.count}x)
            </span>
          ))}
        </div>
      )}

      {data.recentNotes.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Recent notes
          </p>
          {data.recentNotes.map((note, i) => (
            <Link
              key={`${note.sessionId}-${i}`}
              href={`/sessions/${note.sessionId}`}
              className="block rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 transition hover:bg-amber-50"
            >
              <span className="text-xs font-medium text-zinc-400">
                {format(new Date(note.date), "MMM d")}
              </span>
              <span className="ml-2">
                {note.notes.length > 100
                  ? note.notes.slice(0, 100) + "..."
                  : note.notes}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
