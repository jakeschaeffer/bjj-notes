"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import { Modal } from "@/components/ui/modal";

export default function TechniquesPage() {
  const [query, setQuery] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<string | "">("");
  const [activeTechniqueId, setActiveTechniqueId] = useState<string | null>(null);
  const [activePositionId, setActivePositionId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<
    { type: "position" | "technique"; id: string } | null
  >(null);
  const [editNotes, setEditNotes] = useState("");
  const { sessions } = useLocalSessions();
  const {
    index,
    techniqueNotesById,
    positionNotesById,
    updateTechniqueNote,
    updatePositionNote,
  } = useUserTaxonomy();

  const results = useMemo(() => {
    if (query.trim().length > 0) {
      return index.techniqueSearch.search(query.trim()).map((result) => result.item);
    }

    if (selectedPosition) {
      return index.getTechniquesByPosition(selectedPosition);
    }

    return index.techniquesByName;
  }, [query, selectedPosition, index]);

  const sessionNotes = useMemo(() => {
    const techniqueNotes: Record<
      string,
      { sessionId: string; date: string; notes: string; keyDetails: string[] }[]
    > = {};
    const positionNotes: Record<
      string,
      { sessionId: string; date: string; notes: string; keyDetails: string[] }[]
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

    return { techniqueNotes, positionNotes };
  }, [sessions]);

  const activeTechnique = activeTechniqueId
    ? index.techniquesById.get(activeTechniqueId) ?? null
    : null;
  const activePosition = activePositionId
    ? index.positionsById.get(activePositionId) ?? null
    : null;
  const activeTechniqueNote = activeTechnique
    ? techniqueNotesById.get(activeTechnique.id)?.notes ?? ""
    : "";
  const activePositionNote = activePosition
    ? positionNotesById.get(activePosition.id)?.notes ?? ""
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
          Techniques
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Technique library</h1>
        <p className="text-sm text-zinc-600">
          Search by name or filter by position.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: kimura, sweep, guard"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Filter by position
            <select
              value={selectedPosition}
              onChange={(event) => setSelectedPosition(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">All positions</option>
              {index.positionsInTreeOrder.map((position) => (
                <option key={position.id} value={position.id}>
                  {index.getFullPath(position.id)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="text-sm text-zinc-500">
          Showing {results.length} technique{results.length === 1 ? "" : "s"}.
        </div>
      </section>

      <section className="grid gap-3">
        {results.map((technique) => {
          const positionName = index.positionsById.get(
            technique.positionFromId,
          )?.name;
          return (
            <button
              key={technique.id}
              type="button"
              onClick={() => {
                setActivePositionId(null);
                setActiveTechniqueId(technique.id);
              }}
              className="rounded-2xl border border-zinc-100 bg-white p-5 text-left shadow-sm transition hover:border-amber-200 hover:bg-amber-50/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{technique.name}</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {technique.category.replace(/-/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                From {positionName ?? "Unknown position"}
              </p>
              <p className="mt-2 text-xs font-semibold text-zinc-400">
                {(sessionNotes.techniqueNotes[technique.id] ?? []).length} session
                notes • {techniqueNotesById.get(technique.id)?.notes ? "1" : "0"}{" "}
                personal note
              </p>
            </button>
          );
        })}
      </section>

      <Modal
        open={Boolean(activePosition || activeTechnique)}
        onClose={() => {
          setActivePositionId(null);
          setActiveTechniqueId(null);
        }}
        title={activePosition?.name ?? activeTechnique?.name ?? "Entry details"}
      >
        {activeTechnique ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              ) : (
                <span className="text-sm text-zinc-500">Position unknown</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditTarget({ type: "technique", id: activeTechnique.id });
                  setEditNotes(activeTechniqueNote);
                }}
                className="text-xs font-semibold text-amber-600"
              >
                Edit notes
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Personal notes
              </p>
              {activeTechniqueNote ? (
                <p className="mt-2 text-sm text-zinc-600">{activeTechniqueNote}</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No personal notes.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Session notes
              </p>
              {sessionNotes.techniqueNotes[activeTechnique.id]?.length ? (
                <div className="mt-2 space-y-3">
                  {sessionNotes.techniqueNotes[activeTechnique.id].map(
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
                        {entry.notes ? <p className="mt-2">{entry.notes}</p> : null}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No session notes yet.</p>
              )}
            </div>
          </div>
        ) : null}

        {activePosition ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Position details
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditTarget({ type: "position", id: activePosition.id });
                  setEditNotes(activePositionNote);
                }}
                className="text-xs font-semibold text-amber-600"
              >
                Edit notes
              </button>
            </div>

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

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Personal notes
              </p>
              {activePositionNote ? (
                <p className="mt-2 text-sm text-zinc-600">{activePositionNote}</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No personal notes.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Session notes
              </p>
              {sessionNotes.positionNotes[activePosition.id]?.length ? (
                <div className="mt-2 space-y-3">
                  {sessionNotes.positionNotes[activePosition.id].map(
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
                        {entry.notes ? <p className="mt-2">{entry.notes}</p> : null}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No session notes yet.</p>
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
