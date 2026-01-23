"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";

import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import { Modal } from "@/components/ui/modal";

function sortCounts(entries: Record<string, number>) {
  return Object.entries(entries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

export default function ProgressPage() {
  const { sessions } = useLocalSessions();
  const {
    index,
    techniqueNotesById,
    positionNotesById,
    updateTechniqueNote,
    updatePositionNote,
  } = useUserTaxonomy();
  const [activePositionId, setActivePositionId] = useState<string | null>(null);
  const [activeTechniqueId, setActiveTechniqueId] = useState<string | null>(null);
  const [positionQuery, setPositionQuery] = useState("");
  const [techniqueQuery, setTechniqueQuery] = useState("");
  const [editTarget, setEditTarget] = useState<
    { type: "position" | "technique"; id: string } | null
  >(null);
  const [editNotes, setEditNotes] = useState("");

  const stats = useMemo(() => {
    const positionCounts: Record<string, number> = {};
    const techniqueCounts: Record<string, number> = {};
    const positionNotes: Record<
      string,
      { sessionId: string; date: string; notes: string; keyDetails: string[] }[]
    > = {};
    const techniqueNotes: Record<
      string,
      { sessionId: string; date: string; notes: string; keyDetails: string[] }[]
    > = {};

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
        if (note.positionId) {
          positionCounts[note.positionId] =
            (positionCounts[note.positionId] ?? 0) + 1;
        }

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
      positionCounts,
      techniqueCounts,
      positionNotes,
      techniqueNotes,
    };
  }, [sessions]);

  const loggedPositions = useMemo(() => {
    return Object.keys(stats.positionCounts)
      .map((id) => index.positionsById.get(id))
      .filter((position): position is NonNullable<typeof position> => Boolean(position))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [index.positionsById, stats.positionCounts]);

  const loggedTechniques = useMemo(() => {
    return Object.keys(stats.techniqueCounts)
      .map((id) => index.techniquesById.get(id))
      .filter(
        (technique): technique is NonNullable<typeof technique> =>
          Boolean(technique),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [index.techniquesById, stats.techniqueCounts]);

  const filteredPositions = useMemo(() => {
    const query = positionQuery.trim().toLowerCase();
    if (!query) {
      return loggedPositions;
    }
    return loggedPositions.filter((position) =>
      position.name.toLowerCase().includes(query),
    );
  }, [loggedPositions, positionQuery]);

  const filteredTechniques = useMemo(() => {
    const query = techniqueQuery.trim().toLowerCase();
    if (!query) {
      return loggedTechniques;
    }
    return loggedTechniques.filter((technique) =>
      technique.name.toLowerCase().includes(query),
    );
  }, [loggedTechniques, techniqueQuery]);

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
    if (!activePositionId) {
      return [];
    }
    return index.getBreadcrumb(activePositionId);
  }, [activePositionId, index]);

  const activePositionChildren = useMemo(() => {
    if (!activePositionId) {
      return [];
    }
    return index.getChildren(activePositionId);
  }, [activePositionId, index]);

  const activePositionTechniques = useMemo(() => {
    if (!activePositionId) {
      return [];
    }

    const ids = new Set<string>();
    const stack = [activePositionId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || ids.has(current)) {
        continue;
      }
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
                <li key={positionId}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTechniqueId(null);
                      setActivePositionId(positionId);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition hover:bg-amber-50"
                  >
                    <span>{index.positionsById.get(positionId)?.name ?? positionId}</span>
                    <span className="font-semibold text-zinc-800">{count}</span>
                  </button>
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
                  <li key={techniqueId}>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePositionId(null);
                        setActiveTechniqueId(techniqueId);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition hover:bg-amber-50"
                    >
                      <span>{technique?.name ?? techniqueId}</span>
                      <span className="font-semibold text-zinc-800">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Explore positions</h2>
          <input
            value={positionQuery}
            onChange={(event) => setPositionQuery(event.target.value)}
            placeholder="Search positions"
            className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {filteredPositions.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No positions logged yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              {filteredPositions.map((position) => (
                <li key={position.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTechniqueId(null);
                      setActivePositionId(position.id);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition hover:bg-amber-50"
                  >
                    <span>{position.name}</span>
                    <span className="text-xs text-zinc-400">
                      {stats.positionCounts[position.id] ?? 0} logs •{" "}
                      {(stats.positionNotes[position.id] ?? []).length} notes
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Explore techniques</h2>
          <input
            value={techniqueQuery}
            onChange={(event) => setTechniqueQuery(event.target.value)}
            placeholder="Search techniques"
            className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {filteredTechniques.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No techniques logged yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              {filteredTechniques.map((technique) => (
                <li key={technique.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePositionId(null);
                      setActiveTechniqueId(technique.id);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition hover:bg-amber-50"
                  >
                    <span>{technique.name}</span>
                    <span className="text-xs text-zinc-400">
                      {stats.techniqueCounts[technique.id] ?? 0} logs •{" "}
                      {(stats.techniqueNotes[technique.id] ?? []).length} notes
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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
                      {indexValue < activePositionBreadcrumb.length - 1 ? " /" : ""}
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
                    setEditTarget({ type: "position", id: activePosition.id });
                    setEditNotes(activePositionNote);
                  }}
                  className="text-xs font-semibold text-amber-600"
                >
                  Edit
                </button>
              </div>
              {activePositionNote ? (
                <p className="mt-2 text-sm text-zinc-600">{activePositionNote}</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No personal notes.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Notes
              </p>
              {stats.positionNotes[activePosition.id]?.length ? (
                <div className="mt-2 space-y-3">
                  {stats.positionNotes[activePosition.id].map((entry, indexValue) => (
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
                  ))}
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
                <p className="mt-2 text-sm text-zinc-500">No techniques logged yet.</p>
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
                    setEditTarget({ type: "technique", id: activeTechnique.id });
                    setEditNotes(activeTechniqueNote);
                  }}
                  className="text-xs font-semibold text-amber-600"
                >
                  Edit
                </button>
              </div>
              {activeTechniqueNote ? (
                <p className="mt-2 text-sm text-zinc-600">{activeTechniqueNote}</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No personal notes.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Notes
              </p>
              {stats.techniqueNotes[activeTechnique.id]?.length ? (
                <div className="mt-2 space-y-3">
                  {stats.techniqueNotes[activeTechnique.id].map((entry, indexValue) => (
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
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No notes yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

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
                if (!editTarget) {
                  return;
                }
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
