"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import { Modal } from "@/components/ui/modal";
import {
  TrainingCalendar,
  StreakStats,
  TechniqueRecencyList,
  PositionCoverageChart,
  SparringTimeline,
  KnowledgeCard,
} from "@/components/progress";

export default function ProgressPage() {
  const { sessions } = useLocalSessions();
  const {
    index,
    techniqueNotesById,
    positionNotesById,
    updateTechniqueNote,
    updatePositionNote,
  } = useUserTaxonomy();

  // Modal state for position/technique detail (preserved from original)
  const [activePositionId, setActivePositionId] = useState<string | null>(null);
  const [activeTechniqueId, setActiveTechniqueId] = useState<string | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<{
    type: "position" | "technique";
    id: string;
  } | null>(null);
  const [editNotes, setEditNotes] = useState("");

  // Knowledge cards state
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [showAllKnowledge, setShowAllKnowledge] = useState(false);

  // Build stats for modal content
  const stats = useMemo(() => {
    const positionNotes: Record<
      string,
      {
        sessionId: string;
        date: string;
        notes: string;
        keyDetails: string[];
      }[]
    > = {};
    const techniqueNotes: Record<
      string,
      {
        sessionId: string;
        date: string;
        notes: string;
        keyDetails: string[];
      }[]
    > = {};

    for (const session of sessions) {
      for (const technique of session.techniques) {
        if (technique.notes.trim() || technique.keyDetails.length > 0) {
          const entries = techniqueNotes[technique.techniqueId] ?? [];
          entries.push({
            sessionId: session.id,
            date: session.date,
            notes: technique.notes.trim(),
            keyDetails: technique.keyDetails,
          });
          techniqueNotes[technique.techniqueId] = entries;
        }
      }

      for (const note of session.positionNotes) {
        if (note.notes.trim() || note.keyDetails.length > 0) {
          const entries = positionNotes[note.positionId] ?? [];
          entries.push({
            sessionId: session.id,
            date: session.date,
            notes: note.notes.trim(),
            keyDetails: note.keyDetails,
          });
          positionNotes[note.positionId] = entries;
        }
      }
    }

    return { positionNotes, techniqueNotes };
  }, [sessions]);

  // Positions that have session data (for knowledge cards)
  const knowledgePositions = useMemo(() => {
    const positionCounts = new Map<string, number>();
    for (const session of sessions) {
      for (const technique of session.techniques) {
        if (technique.positionId) {
          positionCounts.set(
            technique.positionId,
            (positionCounts.get(technique.positionId) ?? 0) + 1,
          );
        }
      }
      for (const note of session.positionNotes) {
        positionCounts.set(
          note.positionId,
          (positionCounts.get(note.positionId) ?? 0) + 1,
        );
      }
    }

    return [...positionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => index.positionsById.get(id))
      .filter(
        (p): p is NonNullable<typeof p> => Boolean(p),
      );
  }, [sessions, index]);

  const filteredKnowledgePositions = useMemo(() => {
    const query = knowledgeQuery.trim().toLowerCase();
    if (!query) return knowledgePositions;
    return knowledgePositions.filter((p) =>
      p.name.toLowerCase().includes(query),
    );
  }, [knowledgePositions, knowledgeQuery]);

  const displayKnowledgePositions = showAllKnowledge
    ? filteredKnowledgePositions
    : filteredKnowledgePositions.slice(0, 6);

  // Modal computed values (preserved from original)
  const activePosition = activePositionId
    ? index.positionsById.get(activePositionId) ?? null
    : null;
  const activeTechnique = activeTechniqueId
    ? index.techniquesById.get(activeTechniqueId) ?? null
    : null;
  const activePositionNote = activePosition
    ? positionNotesById.get(activePosition.id)?.notes ?? ""
    : "";
  const activeTechniqueNote = activeTechnique
    ? techniqueNotesById.get(activeTechnique.id)?.notes ?? ""
    : "";

  const activePositionBreadcrumb = useMemo(() => {
    if (!activePositionId) return [];
    return index.getBreadcrumb(activePositionId);
  }, [activePositionId, index]);

  const activePositionChildren = useMemo(() => {
    if (!activePositionId) return [];
    return index.getChildren(activePositionId);
  }, [activePositionId, index]);

  const activePositionTechniques = useMemo(() => {
    if (!activePositionId) return [];

    const ids = new Set<string>();
    const stack = [activePositionId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || ids.has(current)) continue;
      ids.add(current);
      const children = index.getChildren(current);
      for (const child of children) {
        stack.push(child.id);
      }
    }

    return index.techniques
      .filter((technique) => ids.has(technique.positionFromId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activePositionId, index]);

  const activeTechniquePosition = activeTechnique
    ? index.positionsById.get(activeTechnique.positionFromId) ?? null
    : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          Progress
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your overview</h1>
        <p className="text-sm text-zinc-600">
          Training consistency, technique coverage, and accumulated knowledge.
        </p>
      </header>

      {/* Streak & consistency stats */}
      <StreakStats sessions={sessions} />

      {/* Training calendar */}
      <section className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Training activity</h2>
        <TrainingCalendar sessions={sessions} />
      </section>

      {/* Technique recency + Position coverage side by side */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <TechniqueRecencyList sessions={sessions} index={index} />
          {sessions.length === 0 && (
            <div>
              <h2 className="text-lg font-semibold">Technique recency</h2>
              <p className="mt-2 text-sm text-zinc-600">No data yet.</p>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <PositionCoverageChart
            sessions={sessions}
            index={index}
            onPositionClick={(positionId) => {
              setActiveTechniqueId(null);
              setActivePositionId(positionId);
            }}
          />
          {sessions.length === 0 && (
            <div>
              <h2 className="text-lg font-semibold">Position coverage</h2>
              <p className="mt-2 text-sm text-zinc-600">No data yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Sparring timeline */}
      <section className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <SparringTimeline sessions={sessions} />
        {sessions.every(
          (s) => s.sparringRounds.length === 0 && !s.legacySparring,
        ) && (
          <div>
            <h2 className="text-lg font-semibold">Sparring</h2>
            <p className="mt-2 text-sm text-zinc-600">No sparring data yet.</p>
          </div>
        )}
      </section>

      {/* Knowledge cards */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">What you know</h2>
            <p className="text-sm text-zinc-500">
              Knowledge organized by position.
            </p>
          </div>
          <input
            value={knowledgeQuery}
            onChange={(e) => setKnowledgeQuery(e.target.value)}
            placeholder="Search positions..."
            className="w-48 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        {displayKnowledgePositions.length === 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-600">
              {knowledgeQuery
                ? "No positions match your search."
                : "No positions logged yet. Log sessions to build your knowledge base."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {displayKnowledgePositions.map((position) => (
              <KnowledgeCard
                key={position.id}
                position={position}
                sessions={sessions}
                index={index}
                personalNotes={
                  positionNotesById.get(position.id)?.notes ?? ""
                }
                onEditNotes={() => {
                  setEditTarget({ type: "position", id: position.id });
                  setEditNotes(
                    positionNotesById.get(position.id)?.notes ?? "",
                  );
                }}
              />
            ))}
          </div>
        )}

        {filteredKnowledgePositions.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllKnowledge(!showAllKnowledge)}
            className="text-xs font-semibold text-amber-600"
          >
            {showAllKnowledge
              ? "Show less"
              : `Show all ${filteredKnowledgePositions.length} positions`}
          </button>
        )}
      </section>

      {/* Position/Technique detail modal (preserved from original) */}
      <Modal
        open={Boolean(activePosition || activeTechnique)}
        onClose={() => {
          setActivePositionId(null);
          setActiveTechniqueId(null);
        }}
        title={
          activePosition?.name ?? activeTechnique?.name ?? "Entry details"
        }
      >
        {activePosition ? (
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-zinc-600">
              {activePositionBreadcrumb.length > 1 ? (
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-amber-600">
                  {activePositionBreadcrumb.map((item, indexValue) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTechniqueId(null);
                        setActivePositionId(item.id);
                      }}
                      className="rounded-full border border-amber-200 px-2 py-1"
                    >
                      {item.name}
                      {indexValue < activePositionBreadcrumb.length - 1
                        ? " /"
                        : ""}
                    </button>
                  ))}
                </div>
              ) : null}
              {activePositionChildren.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Children
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activePositionChildren.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          setActiveTechniqueId(null);
                          setActivePositionId(child.id);
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600"
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Personal notes
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditTarget({
                      type: "position",
                      id: activePosition.id,
                    });
                    setEditNotes(activePositionNote);
                  }}
                  className="text-xs font-semibold text-amber-600"
                >
                  Edit
                </button>
              </div>
              {activePositionNote ? (
                <p className="mt-2 text-sm text-zinc-600">
                  {activePositionNote}
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">
                  No personal notes.
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Notes
              </p>
              {stats.positionNotes[activePosition.id]?.length ? (
                <div className="mt-2 space-y-3">
                  {stats.positionNotes[activePosition.id].map(
                    (entry, indexValue) => (
                      <div
                        key={`${entry.sessionId}-${entry.date}-${indexValue}`}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-600"
                      >
                        <p className="text-xs font-semibold text-zinc-400">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </p>
                        {entry.keyDetails.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.keyDetails.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {entry.notes ? (
                          <p className="mt-2">{entry.notes}</p>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No notes yet.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Techniques from this position
              </p>
              {activePositionTechniques.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">
                  No techniques logged yet.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activePositionTechniques.map((technique) => (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() => {
                        setActivePositionId(null);
                        setActiveTechniqueId(technique.id);
                      }}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600"
                    >
                      {technique.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTechnique ? (
          <div className="space-y-4">
            {activeTechniquePosition ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTechniqueId(null);
                  setActivePositionId(activeTechniquePosition.id);
                }}
                className="text-sm font-semibold text-amber-600"
              >
                From: {activeTechniquePosition.name}
              </button>
            ) : null}

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Personal notes
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditTarget({
                      type: "technique",
                      id: activeTechnique.id,
                    });
                    setEditNotes(activeTechniqueNote);
                  }}
                  className="text-xs font-semibold text-amber-600"
                >
                  Edit
                </button>
              </div>
              {activeTechniqueNote ? (
                <p className="mt-2 text-sm text-zinc-600">
                  {activeTechniqueNote}
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">
                  No personal notes.
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Notes
              </p>
              {stats.techniqueNotes[activeTechnique.id]?.length ? (
                <div className="mt-2 space-y-3">
                  {stats.techniqueNotes[activeTechnique.id].map(
                    (entry, indexValue) => (
                      <div
                        key={`${entry.sessionId}-${entry.date}-${indexValue}`}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-600"
                      >
                        <p className="text-xs font-semibold text-zinc-400">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </p>
                        {entry.keyDetails.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.keyDetails.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {entry.notes ? (
                          <p className="mt-2">{entry.notes}</p>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No notes yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit notes modal */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit notes"
      >
        <div className="space-y-4">
          <textarea
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            className="min-h-[120px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Add your reference notes"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!editTarget) return;
                if (editTarget.type === "position") {
                  updatePositionNote(editTarget.id, editNotes);
                } else {
                  updateTechniqueNote(editTarget.id, editNotes);
                }
                setEditTarget(null);
              }}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Save notes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
