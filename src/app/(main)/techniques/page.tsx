"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";

import { parseLocalDate } from "@/lib/utils";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";

type SortMode = "alpha" | "notes";

type SessionNoteEntry = {
  sessionId: string;
  date: string;
  notes: string;
  keyDetails: string[];
};

export default function TechniquesPage() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("notes");
  const [activeTechniqueId, setActiveTechniqueId] = useState<string | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const { sessions } = useLocalSessions();
  const { index, techniqueNotesById, updateTechniqueNote } = useUserTaxonomy();

  useEffect(() => {
    if (focusId && index.techniquesById.has(focusId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating focused technique from URL param.
      setActiveTechniqueId(focusId);
    }
  }, [focusId, index.techniquesById]);

  const sessionNotesByTech = useMemo(() => {
    const map = new Map<string, SessionNoteEntry[]>();
    for (const session of sessions) {
      for (const t of session.techniques) {
        const hasContent = t.notes.trim() || t.keyDetails.length > 0;
        if (!hasContent) continue;
        const existing = map.get(t.techniqueId) ?? [];
        existing.push({
          sessionId: session.id,
          date: session.date,
          notes: t.notes.trim(),
          keyDetails: t.keyDetails,
        });
        map.set(t.techniqueId, existing);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return map;
  }, [sessions]);

  const firstSeenByTech = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions) {
      for (const t of session.techniques) {
        const existing = map.get(t.techniqueId);
        if (!existing || session.date < existing) {
          map.set(t.techniqueId, session.date);
        }
      }
    }
    return map;
  }, [sessions]);

  const timesLoggedByTech = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of sessions) {
      for (const t of session.techniques) {
        map.set(t.techniqueId, (map.get(t.techniqueId) ?? 0) + 1);
      }
    }
    return map;
  }, [sessions]);

  const timesInSparringByTech = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of sessions) {
      for (const round of session.sparringRounds) {
        for (const s of round.submissionsFor ?? []) {
          map.set(s.techniqueId, (map.get(s.techniqueId) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [sessions]);

  const noteCountByTech = useMemo(() => {
    const map = new Map<string, number>();
    for (const [id, list] of sessionNotesByTech.entries()) {
      map.set(id, list.length + (techniqueNotesById.get(id)?.notes ? 1 : 0));
    }
    for (const [id, note] of techniqueNotesById.entries()) {
      if (note.notes && !map.has(id)) map.set(id, 1);
    }
    return map;
  }, [sessionNotesByTech, techniqueNotesById]);

  const q = query.trim();

  const withNotes = useMemo(() => {
    const items = index.techniques
      .filter((t) => (noteCountByTech.get(t.id) ?? 0) > 0)
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q.toLowerCase()) ||
          (t.aliases ?? []).some((a) =>
            a.toLowerCase().includes(q.toLowerCase()),
          ),
      );
    if (sortMode === "alpha") {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items.sort(
        (a, b) =>
          (noteCountByTech.get(b.id) ?? 0) - (noteCountByTech.get(a.id) ?? 0) ||
          a.name.localeCompare(b.name),
      );
    }
    return items;
  }, [index.techniques, noteCountByTech, q, sortMode]);

  const allOthers = useMemo(() => {
    const items = index.techniques
      .filter((t) => (noteCountByTech.get(t.id) ?? 0) === 0)
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q.toLowerCase()) ||
          (t.aliases ?? []).some((a) =>
            a.toLowerCase().includes(q.toLowerCase()),
          ),
      );
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [index.techniques, noteCountByTech, q]);

  const activeTechnique = activeTechniqueId
    ? index.techniquesById.get(activeTechniqueId) ?? null
    : null;
  const activeTechniquePosition = activeTechnique
    ? index.positionsById.get(activeTechnique.positionFromId) ?? null
    : null;
  const activeTechniqueNote = activeTechnique
    ? techniqueNotesById.get(activeTechnique.id)?.notes ?? ""
    : "";
  const activeSessionNotes = activeTechniqueId
    ? sessionNotesByTech.get(activeTechniqueId) ?? []
    : [];
  const activeFirstSeen = activeTechniqueId
    ? firstSeenByTech.get(activeTechniqueId)
    : undefined;
  const activeTimesLogged = activeTechniqueId
    ? timesLoggedByTech.get(activeTechniqueId) ?? 0
    : 0;
  const activeTimesInSparring = activeTechniqueId
    ? timesInSparringByTech.get(activeTechniqueId) ?? 0
    : 0;

  function openTechnique(id: string) {
    setActiveTechniqueId(id);
    setEditing(false);
  }

  function closeModal() {
    setActiveTechniqueId(null);
    setEditing(false);
  }

  return (
    <>
      <style>{css}</style>
      <div className="t-root">
        <div className="t-shell">
          <div className="t-hdr">
            <div>
              <h1>Technique Library</h1>
              <div className="no mono">
                {index.techniques.length} entries ·{" "}
                {withNotes.length} with notes
              </div>
            </div>
          </div>

          <section>
            <div className="label">
              <span>Filter</span>
              <span className="num mono">
                {(withNotes.length + allOthers.length)} shown
              </span>
            </div>
            <input
              className="t-search mono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="kimura, sweep, guard…"
            />
            <div className="t-sort">
              <span className="t-sort-label">Sort</span>
              <button
                type="button"
                className={`t-sort-btn ${sortMode === "notes" ? "on" : ""}`}
                onClick={() => setSortMode("notes")}
              >
                Most notes
              </button>
              <button
                type="button"
                className={`t-sort-btn ${sortMode === "alpha" ? "on" : ""}`}
                onClick={() => setSortMode("alpha")}
              >
                A–Z
              </button>
            </div>
          </section>

          {withNotes.length > 0 && (
            <section>
              <div className="label">
                <span>Your notes</span>
                <span className="num mono">{withNotes.length}</span>
              </div>
              <div className="t-list">
                {withNotes.map((technique) => {
                  const count = noteCountByTech.get(technique.id) ?? 0;
                  const position = index.positionsById.get(
                    technique.positionFromId,
                  );
                  return (
                    <button
                      key={technique.id}
                      type="button"
                      className="t-row t-row-primary"
                      onClick={() => openTechnique(technique.id)}
                    >
                      <div className="t-row-name">
                        <div className="t-row-tech">{technique.name}</div>
                        <div className="t-row-pos mono">
                          {position?.name ?? "—"}
                        </div>
                      </div>
                      <div className="t-row-cat mono">
                        {technique.category.replace(/-/g, " ")}
                      </div>
                      <div className="t-row-count mono" title={`${count} ${count === 1 ? "note" : "notes"}`}>
                        {count}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="label">
              <span>All techniques</span>
              <span className="num mono">{allOthers.length}</span>
            </div>
            <div className="t-list">
              {allOthers.map((technique) => {
                const position = index.positionsById.get(
                  technique.positionFromId,
                );
                return (
                  <button
                    key={technique.id}
                    type="button"
                    className="t-row"
                    onClick={() => openTechnique(technique.id)}
                  >
                    <div className="t-row-name">
                      <div className="t-row-tech">{technique.name}</div>
                      <div className="t-row-pos mono">
                        {position?.name ?? "—"}
                      </div>
                    </div>
                    <div className="t-row-cat mono">
                      {technique.category.replace(/-/g, " ")}
                    </div>
                    <div className="t-row-count mono t-row-count-muted">—</div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {activeTechnique && (
        <div
          className="t-modal-scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="t-modal">
            <div className="t-modal-hdr">
              <div>
                <h2 className="t-modal-title">{activeTechnique.name}</h2>
                <div className="t-modal-sub mono">
                  {activeTechniquePosition?.name ?? "—"} ·{" "}
                  {activeTechnique.category.replace(/-/g, " ")}
                </div>
              </div>
              <button
                type="button"
                className="t-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <section className="t-modal-section">
              <div className="label">
                <span>Profile</span>
              </div>
              <div className="t-stats">
                <div className="t-stat">
                  <div className="k">First seen</div>
                  <div className="v mono">
                    {activeFirstSeen
                      ? format(parseLocalDate(activeFirstSeen), "MMM d")
                      : "—"}
                  </div>
                </div>
                <div className="t-stat">
                  <div className="k">Drilled</div>
                  <div className="v mono">{activeTimesLogged}</div>
                </div>
                <div className="t-stat">
                  <div className="k">Sparring</div>
                  <div className="v mono">{activeTimesInSparring}</div>
                </div>
                <div className="t-stat">
                  <div className="k">Notes</div>
                  <div className="v mono">
                    {noteCountByTech.get(activeTechnique.id) ?? 0}
                  </div>
                </div>
              </div>
            </section>

            <section className="t-modal-section">
              <div className="label">
                <span>Personal notes</span>
                {!editing && (
                  <button
                    type="button"
                    className="t-link-btn"
                    onClick={() => {
                      setEditing(true);
                      setEditNotes(activeTechniqueNote);
                    }}
                  >
                    {activeTechniqueNote ? "Edit" : "Add"}
                  </button>
                )}
              </div>
              {editing ? (
                <div className="t-edit">
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Reference notes — mechanics, common pitfalls, coaching cues…"
                    rows={5}
                  />
                  <div className="t-edit-row">
                    <button
                      type="button"
                      className="t-btn t-btn-ghost"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="t-btn t-btn-primary"
                      onClick={() => {
                        updateTechniqueNote(activeTechnique.id, editNotes);
                        setEditing(false);
                      }}
                    >
                      Save notes
                    </button>
                  </div>
                </div>
              ) : activeTechniqueNote ? (
                <div className="t-note">{activeTechniqueNote}</div>
              ) : (
                <div className="t-muted">No personal notes.</div>
              )}
            </section>

            {activeSessionNotes.length > 0 && (
              <section className="t-modal-section">
                <div className="label">
                  <span>Session cues</span>
                  <span className="num mono">
                    {activeSessionNotes.length}{" "}
                    {activeSessionNotes.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <div className="t-entries">
                  {activeSessionNotes.map((entry, i) => (
                    <div
                      key={`${entry.sessionId}-${i}`}
                      className="t-entry"
                    >
                      <div className="t-entry-head">
                        <span className="mono">
                          {format(parseLocalDate(entry.date), "MMM d, yyyy")}
                        </span>
                      </div>
                      {entry.keyDetails.length > 0 && (
                        <div className="t-cues">
                          {entry.keyDetails.map((cue, ci) => (
                            <div key={ci} className="t-cue">
                              {cue}
                            </div>
                          ))}
                        </div>
                      )}
                      {entry.notes && (
                        <div className="t-entry-note">{entry.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const css = `
  .t-root {
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
    --paper-yellow: #fff9e4;
    font-family: var(--font-inter), sans-serif;
    color: var(--ink);
    background: var(--bg);
    min-height: calc(100vh - 64px);
    margin-left: -20px;
    margin-right: -20px;
    margin-top: -24px;
    margin-bottom: -48px;
    padding-bottom: 24px;
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
  }
  .t-shell { max-width: 460px; margin: 0 auto; }
  .t-root .mono { font-family: var(--font-ibm-plex-mono), ui-monospace, monospace; }
  .t-hdr {
    padding: 22px 20px 14px;
    border-bottom: 1px solid var(--ink);
  }
  .t-hdr h1 {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: 0;
  }
  .t-hdr .no {
    font-size: 10px;
    letter-spacing: 0.12em;
    opacity: 0.5;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .t-root section {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
  }
  .t-root .label {
    font-size: 9.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .t-root .label .num { font-variant-numeric: tabular-nums; }
  .t-search {
    width: 100%;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: #fff;
    padding: 10px 12px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 13px;
    outline: none;
    color: inherit;
  }
  .t-search:focus { border-color: var(--ink); }
  .t-search::placeholder { color: rgba(26, 24, 21, 0.35); font-style: italic; }
  .t-sort {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    align-items: center;
  }
  .t-sort-label {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
    padding-right: 4px;
  }
  .t-sort-btn {
    font-family: inherit;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 6px 10px;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .t-sort-btn.on {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .t-list {
    border-top: 1px solid var(--ink);
  }
  .t-row {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto 36px;
    gap: 10px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
    background: transparent;
    border-left: none;
    border-right: none;
    border-bottom: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: inherit;
  }
  .t-row:first-child { border-top: none; }
  .t-row:hover { background: rgba(26, 24, 21, 0.03); }
  .t-row-primary {
    background: rgba(26, 24, 21, 0.02);
  }
  .t-row-primary:hover {
    background: rgba(26, 24, 21, 0.06);
  }
  .t-row-name { min-width: 0; }
  .t-row-tech {
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .t-row-pos {
    font-size: 10.5px;
    opacity: 0.55;
    letter-spacing: 0.04em;
    margin-top: 1px;
  }
  .t-row-cat {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.5;
  }
  .t-row-count {
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--accent);
    font-weight: 600;
  }
  .t-row-count-muted {
    color: rgba(26, 24, 21, 0.3);
    font-weight: 400;
  }

  /* Modal */
  .t-modal-scrim {
    position: fixed;
    inset: 0;
    background: rgba(26, 24, 21, 0.55);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
    --paper-yellow: #fff9e4;
    font-family: var(--font-inter), sans-serif;
  }
  .t-modal {
    background: #fff;
    border: 1px solid var(--ink);
    border-radius: 4px;
    width: 100%;
    max-width: 480px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    color: var(--ink);
    box-shadow: 0 20px 60px rgba(26, 24, 21, 0.35);
    font-size: 13px;
  }
  .t-modal .mono { font-family: var(--font-ibm-plex-mono), monospace; }
  .t-modal-hdr {
    padding: 20px 20px 14px;
    border-bottom: 1px solid var(--ink);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .t-modal-title {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
  }
  .t-modal-sub {
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-top: 4px;
  }
  .t-modal-close {
    border: 1px solid rgba(26, 24, 21, 0.2);
    background: transparent;
    width: 32px;
    height: 32px;
    font-size: 18px;
    cursor: pointer;
    color: var(--ink);
    font-family: inherit;
    padding: 0;
    border-radius: 0;
    line-height: 1;
    flex-shrink: 0;
  }
  .t-modal-close:hover { background: rgba(26, 24, 21, 0.06); }
  .t-modal-section {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
  }
  .t-modal-section:last-child { border-bottom: none; }
  .t-modal .label {
    font-size: 9.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .t-modal .label .num { font-variant-numeric: tabular-nums; }
  .t-link-btn {
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 4px 8px;
    border: 1px solid rgba(26, 24, 21, 0.25);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .t-link-btn:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .t-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    border-top: 1px solid var(--ink);
    padding-top: 12px;
    margin-top: 4px;
  }
  .t-stat { display: flex; flex-direction: column; gap: 2px; }
  .t-stat .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .t-stat .v {
    font-size: 15px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .t-note {
    font-size: 13px;
    line-height: 1.5;
    color: rgba(26, 24, 21, 0.85);
    padding-top: 4px;
  }
  .t-muted {
    font-size: 12px;
    color: rgba(26, 24, 21, 0.5);
    font-style: italic;
  }
  .t-edit {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .t-edit textarea {
    width: 100%;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: #fff;
    padding: 10px 12px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12.5px;
    line-height: 1.45;
    resize: vertical;
    outline: none;
    color: inherit;
  }
  .t-edit textarea:focus { border-color: var(--ink); }
  .t-edit-row { display: flex; gap: 8px; justify-content: flex-end; }
  .t-btn {
    font-family: inherit;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 9px 14px;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .t-btn-primary {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .t-btn-primary:hover { background: var(--accent); border-color: var(--accent); }
  .t-btn-ghost:hover { background: rgba(26, 24, 21, 0.06); }
  .t-entries {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--ink);
  }
  .t-entry {
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .t-entry:first-child { border-top: none; }
  .t-entry-head {
    font-size: 9.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .t-cues {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .t-cue {
    background: var(--paper-yellow);
    border-left: 3px solid oklch(0.7 0.12 75);
    padding: 6px 10px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #3a2e12;
  }
  .t-entry-note {
    font-size: 12.5px;
    line-height: 1.5;
    color: rgba(26, 24, 21, 0.85);
  }
`;
