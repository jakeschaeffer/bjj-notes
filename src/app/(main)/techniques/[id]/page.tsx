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
      positionName?: string;
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

export default function TechniqueProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const { sessions } = useLocalSessions();
  const { index, techniqueNotesById, updateTechniqueNote } = useUserTaxonomy();

  const technique = id ? index.techniquesById.get(id) ?? null : null;
  const position = technique
    ? index.positionsById.get(technique.positionFromId) ?? null
    : null;
  const personalNote = id
    ? techniqueNotesById.get(id)?.notes ?? ""
    : "";

  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!id) return [];
    const entries: TimelineEntry[] = [];
    for (const session of sessions) {
      for (const t of session.techniques) {
        if (t.techniqueId !== id) continue;
        const pos = t.positionId
          ? index.positionsById.get(t.positionId)
          : null;
        entries.push({
          kind: "drilled",
          sessionId: session.id,
          date: session.date,
          positionName: pos?.name,
          cues: t.keyDetails ?? [],
          note: t.notes ?? "",
        });
      }
      for (const round of session.sparringRounds) {
        const hit = (round.submissionsFor ?? []).some(
          (s) => s.techniqueId === id,
        );
        if (!hit) continue;
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
  }, [id, sessions, index.positionsById]);

  const drilledCount = timeline.filter((e) => e.kind === "drilled").length;
  const sparringCount = timeline.filter((e) => e.kind === "sparred").length;
  const firstSeen = timeline.length
    ? timeline[timeline.length - 1].date
    : undefined;
  const noteCount =
    timeline.reduce(
      (sum, e) =>
        sum +
        (e.kind === "drilled"
          ? e.cues.length + (e.note ? 1 : 0)
          : e.roundNotes
            ? 1
            : 0),
      0,
    ) + (personalNote ? 1 : 0);

  if (!technique) {
    return (
      <>
        <style>{css}</style>
        <div className="tp-root">
          <div className="tp-shell">
            <div className="tp-hdr">
              <div>
                <h1>Technique</h1>
                <div className="no mono">Not found</div>
              </div>
            </div>
            <div className="tp-empty">
              <p>No technique with that id.</p>
              <Link href="/techniques" className="tp-back">
                ← Back to library
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
      <div className="tp-root">
        <div className="tp-shell">
          <div className="tp-hdr">
            <div>
              <h1>{technique.name}</h1>
              <div className="no mono">
                {position?.name ?? "—"} ·{" "}
                {technique.category.replace(/-/g, " ")}
              </div>
            </div>
            <div className="tp-hdr-actions">
              <button
                type="button"
                className="tp-action tp-action-ghost"
                onClick={() => router.back()}
              >
                Back
              </button>
              <Link href="/techniques" className="tp-action tp-action-ghost">
                Library
              </Link>
            </div>
          </div>

          <section className="tp-section">
            <div className="tp-label">
              <span>Profile</span>
            </div>
            <div className="tp-stats">
              <div className="tp-stat">
                <div className="k">First seen</div>
                <div className="v mono">
                  {firstSeen
                    ? format(parseLocalDate(firstSeen), "MMM d")
                    : "—"}
                </div>
              </div>
              <div className="tp-stat">
                <div className="k">Drilled</div>
                <div className="v mono">{drilledCount}</div>
              </div>
              <div className="tp-stat">
                <div className="k">Sparring</div>
                <div className="v mono">{sparringCount}</div>
              </div>
              <div className="tp-stat">
                <div className="k">Notes</div>
                <div className="v mono">{noteCount}</div>
              </div>
            </div>
          </section>

          <section className="tp-section">
            <div className="tp-label">
              <span>Personal notes</span>
              {!editing && (
                <button
                  type="button"
                  className="tp-link-btn"
                  onClick={() => {
                    setEditing(true);
                    setEditNotes(personalNote);
                  }}
                >
                  {personalNote ? "Edit" : "Add"}
                </button>
              )}
            </div>
            {editing ? (
              <div className="tp-edit">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reference notes — mechanics, common pitfalls, coaching cues…"
                  rows={6}
                />
                <div className="tp-edit-row">
                  <button
                    type="button"
                    className="tp-btn tp-btn-ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="tp-btn tp-btn-primary"
                    onClick={() => {
                      updateTechniqueNote(technique.id, editNotes);
                      setEditing(false);
                    }}
                  >
                    Save notes
                  </button>
                </div>
              </div>
            ) : personalNote ? (
              <div className="tp-note">{personalNote}</div>
            ) : (
              <div className="tp-muted">
                No personal notes yet. Add reference notes to capture
                mechanics, common pitfalls, or coaching cues.
              </div>
            )}
          </section>

          <section className="tp-section">
            <div className="tp-label">
              <span>Timeline</span>
              <span className="num mono">
                {timeline.length}{" "}
                {timeline.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {timeline.length === 0 ? (
              <div className="tp-muted">
                Not logged yet. Drill it or tag it in a sparring round to
                start building history.
              </div>
            ) : (
              <div className="tp-timeline">
                {timeline.map((entry, i) => (
                  <Link
                    key={`${entry.sessionId}-${i}`}
                    href={`/sessions/${entry.sessionId}`}
                    className={`tp-entry tp-entry-${entry.kind}`}
                  >
                    <div className="tp-entry-head">
                      <span className="tp-entry-date mono">
                        {format(parseLocalDate(entry.date), "MMM d, yyyy")}
                      </span>
                      <span className="tp-entry-kind">
                        {entry.kind === "drilled" ? "Drilled" : "Sparred"}
                      </span>
                      {entry.kind === "sparred" && entry.partner && (
                        <span className="tp-entry-partner">
                          {entry.belt && (
                            <span
                              className="tp-entry-belt"
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
                    {entry.kind === "drilled" && (
                      <>
                        {entry.positionName &&
                          entry.positionName !== position?.name && (
                            <div className="tp-entry-sub mono">
                              from {entry.positionName}
                            </div>
                          )}
                        {entry.cues.length > 0 && (
                          <div className="tp-entry-cues">
                            {entry.cues.map((cue, ci) => (
                              <div key={ci} className="tp-entry-cue">
                                {cue}
                              </div>
                            ))}
                          </div>
                        )}
                        {entry.note && (
                          <div className="tp-entry-note">{entry.note}</div>
                        )}
                      </>
                    )}
                    {entry.kind === "sparred" && entry.roundNotes && (
                      <div className="tp-entry-note mono">
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
  .tp-root {
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
  .tp-shell { max-width: 460px; margin: 0 auto; }
  .tp-root .mono { font-family: var(--font-ibm-plex-mono), ui-monospace, monospace; }
  .tp-hdr {
    padding: 22px 20px 14px;
    border-bottom: 1px solid var(--ink);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .tp-hdr h1 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
  }
  .tp-hdr .no {
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-top: 4px;
  }
  .tp-hdr-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .tp-action {
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
  .tp-action-ghost:hover { background: rgba(26, 24, 21, 0.06); }
  .tp-section {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
  }
  .tp-label {
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
  .tp-label .num { font-variant-numeric: tabular-nums; }
  .tp-link-btn {
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
  .tp-link-btn:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .tp-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    border-top: 1px solid var(--ink);
    padding-top: 12px;
  }
  .tp-stat { display: flex; flex-direction: column; gap: 2px; }
  .tp-stat .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .tp-stat .v {
    font-size: 20px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .tp-note {
    font-size: 13px;
    line-height: 1.55;
    color: rgba(26, 24, 21, 0.88);
    white-space: pre-wrap;
  }
  .tp-muted {
    font-size: 12px;
    color: rgba(26, 24, 21, 0.5);
    font-style: italic;
    line-height: 1.5;
  }
  .tp-edit {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .tp-edit textarea {
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
  .tp-edit textarea:focus { border-color: var(--ink); }
  .tp-edit-row { display: flex; gap: 8px; justify-content: flex-end; }
  .tp-btn {
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
  .tp-btn-primary {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .tp-btn-primary:hover { background: var(--accent); border-color: var(--accent); }
  .tp-btn-ghost:hover { background: rgba(26, 24, 21, 0.06); }
  .tp-timeline {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--ink);
  }
  .tp-entry {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
    text-decoration: none;
    color: inherit;
    cursor: pointer;
  }
  .tp-entry:first-child { border-top: none; }
  .tp-entry:hover { background: rgba(26, 24, 21, 0.03); }
  .tp-entry-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .tp-entry-date {
    font-size: 11px;
    opacity: 0.7;
  }
  .tp-entry-kind {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 2px 7px;
    background: rgba(26, 24, 21, 0.08);
    color: var(--ink);
  }
  .tp-entry-sparred .tp-entry-kind {
    background: var(--accent);
    color: var(--bg);
  }
  .tp-entry-partner {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-left: auto;
  }
  .tp-entry-belt {
    width: 4px;
    height: 14px;
    border-radius: 1px;
    position: relative;
  }
  .tp-entry-belt::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2px;
    height: 2px;
    background: rgba(0, 0, 0, 0.35);
  }
  .tp-entry-sub {
    font-size: 10.5px;
    opacity: 0.55;
    letter-spacing: 0.04em;
  }
  .tp-entry-cues {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .tp-entry-cue {
    background: var(--paper-yellow);
    border-left: 3px solid oklch(0.7 0.12 75);
    padding: 6px 10px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #3a2e12;
  }
  .tp-entry-note {
    font-size: 12.5px;
    line-height: 1.5;
    color: rgba(26, 24, 21, 0.85);
  }
  .tp-empty {
    padding: 40px 20px;
    text-align: center;
    color: rgba(26, 24, 21, 0.6);
  }
  .tp-empty p { margin: 0 0 14px; font-size: 13px; }
  .tp-back {
    display: inline-block;
    padding: 9px 14px;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: 1px solid var(--ink);
    color: var(--ink);
    text-decoration: none;
  }
  .tp-back:hover { background: var(--ink); color: var(--bg); }
`;
