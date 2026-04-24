"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { parseLocalDate } from "@/lib/utils";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";

type TimelineEntry =
  | {
      kind: "drilled";
      sessionId: string;
      date: string;
      techniqueName?: string;
      cues: string[];
      note: string;
    }
  | {
      kind: "note";
      sessionId: string;
      date: string;
      cues: string[];
      note: string;
    }
  | {
      kind: "sparred";
      sessionId: string;
      date: string;
      partner: string | null;
      belt: string | null;
      roundNotes: string;
    };

const BELT_COLORS: Record<string, string> = {
  white: "#e8e2d5",
  blue: "#2a4d7a",
  purple: "#4a2a6a",
  brown: "#5a3820",
  black: "#1a1815",
  unknown: "#b8b0a0",
};

export default function PositionProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Dynamic segment values can arrive URL-encoded (e.g. `custom%3Afoo`
  // for an id with a colon). Decode so the Map.get() lookup matches.
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const { sessions } = useLocalSessions();
  const {
    index,
    positionNotesById,
    updatePositionNote,
    loading: taxLoading,
  } = useUserTaxonomy();

  const position = id ? index.positionsById.get(id) ?? null : null;
  const parent = position?.parentId
    ? index.positionsById.get(position.parentId) ?? null
    : null;
  const children = position ? index.getChildren(position.id) : [];
  const techniquesFromPosition = position
    ? index.getTechniquesByPosition(position.id)
    : [];
  const personalNote = id
    ? positionNotesById.get(id)?.notes ?? ""
    : "";

  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!id) return [];
    const entries: TimelineEntry[] = [];
    for (const session of sessions) {
      for (const t of session.techniques) {
        if (t.positionId !== id) continue;
        const tech = index.techniquesById.get(t.techniqueId);
        entries.push({
          kind: "drilled",
          sessionId: session.id,
          date: session.date,
          techniqueName: tech?.name,
          cues: t.keyDetails ?? [],
          note: t.notes ?? "",
        });
      }
      for (const n of session.positionNotes) {
        if (n.positionId !== id) continue;
        entries.push({
          kind: "note",
          sessionId: session.id,
          date: session.date,
          cues: n.keyDetails ?? [],
          note: n.notes ?? "",
        });
      }
      for (const round of session.sparringRounds) {
        if (!(round.dominantPositions ?? []).includes(id)) continue;
        entries.push({
          kind: "sparred",
          sessionId: session.id,
          date: session.date,
          partner: round.partnerName,
          belt: round.partnerBelt,
          roundNotes: round.notes ?? "",
        });
      }
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }, [id, sessions, index.techniquesById]);

  const drilledCount = timeline.filter((e) => e.kind === "drilled").length;
  const noteCount = timeline.filter((e) => e.kind === "note").length;
  const sparringCount = timeline.filter((e) => e.kind === "sparred").length;
  const firstSeen = timeline.length
    ? timeline[timeline.length - 1].date
    : undefined;

  const firstNoteful = useMemo(() => {
    const drilledOrNote = timeline.filter(
      (e): e is Extract<TimelineEntry, { kind: "drilled" | "note" }> =>
        (e.kind === "drilled" || e.kind === "note") &&
        Boolean(e.note || e.cues.length > 0),
    );
    if (drilledOrNote.length === 0) return null;
    return drilledOrNote[drilledOrNote.length - 1];
  }, [timeline]);

  if (taxLoading) {
    return (
      <>
        <style>{css}</style>
        <div className="pp-root">
          <div className="pp-shell">
            <div className="pp-hdr">
              <div>
                <h1>Position</h1>
                <div className="no mono">Loading…</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!position) {
    return (
      <>
        <style>{css}</style>
        <div className="pp-root">
          <div className="pp-shell">
            <div className="pp-hdr">
              <div>
                <h1>Position</h1>
                <div className="no mono">Not found</div>
              </div>
            </div>
            <div className="pp-empty">
              <p>No position with that id.</p>
              <Link href="/taxonomy" className="pp-back">
                ← Back to taxonomy
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="pp-root">
        <div className="pp-shell">
          <div className="pp-hdr">
            <div>
              <h1>{position.name}</h1>
              <div className="no mono">
                {parent ? `from ${parent.name}` : position.perspective}
              </div>
            </div>
            <div className="pp-hdr-actions">
              <button
                type="button"
                className="pp-action pp-action-ghost"
                onClick={() => router.back()}
              >
                Back
              </button>
              <Link href="/taxonomy" className="pp-action pp-action-ghost">
                Taxonomy
              </Link>
            </div>
          </div>

          <section className="pp-section">
            <div className="pp-label">
              <span>Profile</span>
            </div>
            <div className="pp-stats">
              <div className="pp-stat">
                <div className="k">First seen</div>
                <div className="v mono">
                  {firstSeen
                    ? format(parseLocalDate(firstSeen), "MMM d")
                    : "—"}
                </div>
              </div>
              <div className="pp-stat">
                <div className="k">Drilled</div>
                <div className="v mono">{drilledCount}</div>
              </div>
              <div className="pp-stat">
                <div className="k">Sparring</div>
                <div className="v mono">{sparringCount}</div>
              </div>
              <div className="pp-stat">
                <div className="k">Notes</div>
                <div className="v mono">
                  {noteCount + (personalNote ? 1 : 0)}
                </div>
              </div>
            </div>
          </section>

          <section className="pp-section pp-guide-section">
            <div className="pp-label">
              <span>Guide</span>
              {!editing && (
                <button
                  type="button"
                  className="pp-link-btn"
                  onClick={() => {
                    setEditing(true);
                    setEditNotes(
                      personalNote ||
                        firstNoteful?.note ||
                        (firstNoteful?.cues ?? []).join("\n"),
                    );
                  }}
                >
                  {personalNote ? "Edit" : firstNoteful ? "Make mine" : "Add"}
                </button>
              )}
            </div>
            {editing ? (
              <div className="pp-edit">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Key details, common reactions, what to look for…"
                  rows={8}
                />
                <div className="pp-edit-row">
                  <button
                    type="button"
                    className="pp-btn pp-btn-ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pp-btn pp-btn-primary"
                    onClick={() => {
                      updatePositionNote(position.id, editNotes);
                      setEditing(false);
                    }}
                  >
                    Save guide
                  </button>
                </div>
              </div>
            ) : personalNote ? (
              <div className="pp-guide">{personalNote}</div>
            ) : firstNoteful && (firstNoteful.note || firstNoteful.cues.length > 0) ? (
              <div className="pp-guide-seeded">
                {firstNoteful.note && (
                  <div className="pp-guide">{firstNoteful.note}</div>
                )}
                {firstNoteful.cues.length > 0 && (
                  <div className="pp-guide-cues">
                    {firstNoteful.cues.map((cue, i) => (
                      <div key={i} className="pp-guide-cue">
                        {cue}
                      </div>
                    ))}
                  </div>
                )}
                <div className="pp-guide-caption mono">
                  from first log ·{" "}
                  {format(parseLocalDate(firstNoteful.date), "MMM d, yyyy")}
                </div>
              </div>
            ) : (
              <div className="pp-muted">
                No guide yet. The first note you log from this position
                becomes the guide automatically.
              </div>
            )}
          </section>

          {(children.length > 0 || techniquesFromPosition.length > 0) && (
            <section className="pp-section">
              <div className="pp-label">
                <span>Structure</span>
              </div>
              {children.length > 0 && (
                <div className="pp-struct-block">
                  <div className="pp-struct-k">Children</div>
                  <div className="pp-chips">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/positions/${child.id}`}
                        className="pp-chip pp-chip-pos"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {techniquesFromPosition.length > 0 && (
                <div className="pp-struct-block">
                  <div className="pp-struct-k">
                    Techniques from this position
                  </div>
                  <div className="pp-chips">
                    {techniquesFromPosition.map((t) => (
                      <Link
                        key={t.id}
                        href={`/techniques/${t.id}`}
                        className="pp-chip pp-chip-tech"
                      >
                        {t.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="pp-section">
            <div className="pp-label">
              <span>Timeline</span>
              <span className="num mono">
                {timeline.length}{" "}
                {timeline.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {timeline.length === 0 ? (
              <div className="pp-muted">
                Not logged yet. Drill from here, take a position note, or
                tag it in a sparring round to start building history.
              </div>
            ) : (
              <div className="pp-timeline">
                {timeline.map((entry, i) => (
                  <Link
                    key={`${entry.sessionId}-${i}`}
                    href={`/sessions/${entry.sessionId}`}
                    className={`pp-entry pp-entry-${entry.kind}`}
                  >
                    <div className="pp-entry-head">
                      <span className="pp-entry-date mono">
                        {format(parseLocalDate(entry.date), "MMM d, yyyy")}
                      </span>
                      <span className="pp-entry-kind">
                        {entry.kind === "drilled"
                          ? "Drilled"
                          : entry.kind === "note"
                            ? "Note"
                            : "Sparred"}
                      </span>
                      {entry.kind === "sparred" && entry.partner && (
                        <span className="pp-entry-partner">
                          {entry.belt && (
                            <span
                              className="pp-entry-belt"
                              style={{
                                background:
                                  BELT_COLORS[entry.belt] ??
                                  BELT_COLORS.unknown,
                              }}
                            />
                          )}
                          <span className="mono">{entry.partner}</span>
                        </span>
                      )}
                    </div>
                    {entry.kind === "drilled" && entry.techniqueName && (
                      <div className="pp-entry-sub mono">
                        → {entry.techniqueName}
                      </div>
                    )}
                    {(entry.kind === "drilled" || entry.kind === "note") &&
                      entry.cues.length > 0 && (
                        <div className="pp-entry-cues">
                          {entry.cues.map((cue, ci) => (
                            <div key={ci} className="pp-entry-cue">
                              {cue}
                            </div>
                          ))}
                        </div>
                      )}
                    {(entry.kind === "drilled" || entry.kind === "note") &&
                      entry.note && (
                        <div className="pp-entry-note">{entry.note}</div>
                      )}
                    {entry.kind === "sparred" && entry.roundNotes && (
                      <div className="pp-entry-note mono">
                        {entry.roundNotes}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

const css = `
  .pp-root {
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
  .pp-shell { max-width: 460px; margin: 0 auto; }
  .pp-root .mono { font-family: var(--font-ibm-plex-mono), ui-monospace, monospace; }
  .pp-hdr {
    padding: 22px 20px 14px;
    border-bottom: 1px solid var(--ink);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .pp-hdr h1 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
  }
  .pp-hdr .no {
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-top: 4px;
  }
  .pp-hdr-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .pp-action {
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 7px 11px;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    text-decoration: none;
  }
  .pp-action-ghost:hover { background: rgba(26, 24, 21, 0.06); }
  .pp-section {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
  }
  .pp-label {
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
  .pp-label .num { font-variant-numeric: tabular-nums; }
  .pp-link-btn {
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
  .pp-link-btn:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .pp-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    border-top: 1px solid var(--ink);
    padding-top: 12px;
  }
  .pp-stat { display: flex; flex-direction: column; gap: 2px; }
  .pp-stat .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .pp-stat .v {
    font-size: 20px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .pp-guide-section { padding: 20px; }
  .pp-guide {
    font-size: 15px;
    line-height: 1.6;
    color: rgba(26, 24, 21, 0.92);
    white-space: pre-wrap;
  }
  .pp-guide-seeded {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pp-guide-cues {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pp-guide-cue {
    background: var(--paper-yellow);
    border-left: 3px solid oklch(0.7 0.12 75);
    padding: 10px 14px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #3a2e12;
  }
  .pp-guide-caption {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.45;
    margin-top: 2px;
  }
  .pp-muted {
    font-size: 12px;
    color: rgba(26, 24, 21, 0.5);
    font-style: italic;
    line-height: 1.5;
  }
  .pp-edit {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pp-edit textarea {
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
  .pp-edit textarea:focus { border-color: var(--ink); }
  .pp-edit-row { display: flex; gap: 8px; justify-content: flex-end; }
  .pp-btn {
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
  .pp-btn-primary {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .pp-btn-primary:hover { background: var(--accent); border-color: var(--accent); }
  .pp-btn-ghost:hover { background: rgba(26, 24, 21, 0.06); }
  .pp-struct-block { margin-bottom: 12px; }
  .pp-struct-block:last-child { margin-bottom: 0; }
  .pp-struct-k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .pp-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .pp-chip {
    font-family: inherit;
    font-size: 11.5px;
    padding: 4px 9px;
    border: 1px solid rgba(26, 24, 21, 0.2);
    color: var(--ink);
    text-decoration: none;
    background: #fff;
  }
  .pp-chip-pos { background: rgba(26, 24, 21, 0.06); }
  .pp-chip-tech { background: var(--paper-yellow); color: #3a2e12; border-color: rgba(58, 46, 18, 0.2); }
  .pp-chip:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .pp-timeline {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--ink);
  }
  .pp-entry {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
    text-decoration: none;
    color: inherit;
    cursor: pointer;
  }
  .pp-entry:first-child { border-top: none; }
  .pp-entry:hover { background: rgba(26, 24, 21, 0.03); }
  .pp-entry-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .pp-entry-date {
    font-size: 11px;
    opacity: 0.7;
  }
  .pp-entry-kind {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 2px 7px;
    background: rgba(26, 24, 21, 0.08);
    color: var(--ink);
  }
  .pp-entry-sparred .pp-entry-kind {
    background: var(--accent);
    color: var(--bg);
  }
  .pp-entry-partner {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-left: auto;
  }
  .pp-entry-belt {
    width: 4px;
    height: 14px;
    border-radius: 1px;
    position: relative;
  }
  .pp-entry-belt::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2px;
    height: 2px;
    background: rgba(0, 0, 0, 0.35);
  }
  .pp-entry-sub {
    font-size: 10.5px;
    opacity: 0.55;
    letter-spacing: 0.04em;
  }
  .pp-entry-cues {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .pp-entry-cue {
    background: var(--paper-yellow);
    border-left: 3px solid oklch(0.7 0.12 75);
    padding: 6px 10px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #3a2e12;
  }
  .pp-entry-note {
    font-size: 12.5px;
    line-height: 1.5;
    color: rgba(26, 24, 21, 0.85);
  }
  .pp-empty {
    padding: 40px 20px;
    text-align: center;
    color: rgba(26, 24, 21, 0.6);
  }
  .pp-empty p { margin: 0 0 14px; font-size: 13px; }
  .pp-back {
    display: inline-block;
    padding: 9px 14px;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: 1px solid var(--ink);
    color: var(--ink);
    text-decoration: none;
  }
  .pp-back:hover { background: var(--ink); color: var(--bg); }
`;
