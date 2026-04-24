"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { parseLocalDate } from "@/lib/utils";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";

const BELT_COLORS: Record<string, string> = {
  white: "#e8e2d5",
  blue: "#2a4d7a",
  purple: "#4a2a6a",
  brown: "#5a3820",
  black: "#1a1815",
  unknown: "#b8b0a0",
};

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { sessions, getSessionById, deleteSession } = useLocalSessions();
  const { index } = useUserTaxonomy();
  const sessionId = params?.id;
  const session = sessionId ? getSessionById(sessionId) : undefined;

  if (!session) {
    return (
      <>
        <style>{css}</style>
        <div className="sd-root">
          <div className="sd-shell">
            <div className="sd-hdr">
              <div>
                <h1>Not Found</h1>
                <div className="no mono">No entry matches that id</div>
              </div>
            </div>
            <div className="sd-empty">
              <p>That session does not exist or has been deleted.</p>
              <Link href="/sessions" className="sd-back">
                ← Back to log
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const roundCount = session.sparringRounds.length;
  const subsForCount = session.sparringRounds.reduce(
    (sum, r) => sum + (r.submissionsForCount ?? r.submissionsFor.length),
    0,
  );
  const subsAgainstCount = session.sparringRounds.reduce(
    (sum, r) => sum + (r.submissionsAgainstCount ?? r.submissionsAgainst.length),
    0,
  );
  const useLegacy = roundCount === 0 && session.legacySparring;
  const displayRounds = useLegacy
    ? session.legacySparring?.rounds ?? 0
    : roundCount;
  const displaySubsFor = useLegacy
    ? session.legacySparring?.subsAchieved ?? 0
    : subsForCount;
  const displaySubsAgainst = useLegacy
    ? session.legacySparring?.subsReceived ?? 0
    : subsAgainstCount;
  const net = displaySubsFor - displaySubsAgainst;

  const indexInList = sessions.findIndex((s) => s.id === session.id);
  const entryNum = indexInList >= 0
    ? String(sessions.length - indexInList).padStart(4, "0")
    : "----";

  const classLabel =
    session.giOrNogi === "gi"
      ? "Gi"
      : session.giOrNogi === "nogi"
        ? "No-Gi"
        : session.sessionType === "competition"
          ? "Comp"
          : session.sessionType === "open-mat"
            ? "Open Mat"
            : "Class";

  const hasAnyNotes =
    session.notes ||
    session.insights.length > 0 ||
    session.goalsForNext.length > 0;

  return (
    <>
      <style>{css}</style>
      <div className="sd-root">
        <div className="sd-shell">
          <div className="sd-hdr">
            <div>
              <h1>Entry {entryNum !== "----" ? `N° ${entryNum}` : ""}</h1>
              <div className="no mono">
                {format(parseLocalDate(session.date), "EEE · MMM d, yyyy")}
              </div>
            </div>
            <div className="sd-hdr-actions">
              <Link href="/sessions" className="sd-action sd-action-ghost">
                Back
              </Link>
              <Link
                href={`/log?edit=${session.id}`}
                className="sd-action sd-action-primary"
              >
                Edit
              </Link>
            </div>
          </div>

          <section className="sd-section">
            <div className="sd-label">
              <span>Class</span>
              <span className="num mono">{classLabel}</span>
            </div>
          </section>

          <section className="sd-section">
            <div className="sd-label">
              <span>Moves Drilled</span>
              <span className="num mono">
                {session.techniques.length + session.positionNotes.length} logged
              </span>
            </div>
            {session.techniques.length === 0 &&
            session.positionNotes.length === 0 ? (
              <div className="sd-muted">No moves logged.</div>
            ) : (
              <div className="sd-tbl">
                {session.techniques.map((t, i) => {
                  const pos = t.positionId
                    ? index.positionsById.get(t.positionId)
                    : null;
                  const tech = index.techniquesById.get(t.techniqueId);
                  const cues = t.keyDetails ?? [];
                  return (
                    <div key={t.id} className="sd-tbl-row">
                      <div className="n mono">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="sd-tbl-cell">
                        <div className="sd-tbl-pos mono">
                          {pos?.name ?? "—"}
                        </div>
                        <div className="sd-tbl-tech">
                          {tech?.name ?? "Unknown technique"}
                        </div>
                        {(t.notes || cues.length > 0) && (
                          <div className="sd-cue">
                            <span className="pin">↳</span>
                            {t.notes && <span>{t.notes}</span>}
                            {cues.length > 0 && (
                              <span className="sd-cue-cues">
                                {cues.join(" · ")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {session.positionNotes.map((n, i) => {
                  const pos = index.positionsById.get(n.positionId);
                  const cues = n.keyDetails ?? [];
                  return (
                    <div key={n.id} className="sd-tbl-row">
                      <div className="n mono">
                        {String(session.techniques.length + i + 1).padStart(
                          2,
                          "0",
                        )}
                      </div>
                      <div className="sd-tbl-cell">
                        <div className="sd-tbl-pos mono">
                          {pos?.name ?? "Unknown position"}
                        </div>
                        <div className="sd-tbl-tech sd-tbl-tech-empty">
                          position note
                        </div>
                        {(n.notes || cues.length > 0) && (
                          <div className="sd-cue">
                            <span className="pin">↳</span>
                            {n.notes && <span>{n.notes}</span>}
                            {cues.length > 0 && (
                              <span className="sd-cue-cues">
                                {cues.join(" · ")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="sd-section">
            <div className="sd-label">
              <span>Sparring Rounds</span>
              <span className="num mono">
                {displayRounds} {displayRounds === 1 ? "roll" : "rolls"}
              </span>
            </div>
            {displayRounds === 0 ? (
              <div className="sd-muted">No sparring rounds logged.</div>
            ) : (
              <>
                {session.sparringRounds.map((round, rIdx) => {
                  const subs =
                    round.submissionsForCount ?? round.submissionsFor.length;
                  const tapped =
                    round.submissionsAgainstCount ??
                    round.submissionsAgainst.length;
                  return (
                    <div key={round.id} className="sd-roll">
                      <div className="belt-wrap">
                        <div
                          className="belt"
                          style={{
                            background:
                              BELT_COLORS[round.partnerBelt ?? "unknown"],
                          }}
                        />
                      </div>
                      <div className="sd-roll-name">
                        <span className="sd-roll-partner mono">
                          {round.partnerName || "Partner unknown"}
                        </span>
                        <span className="sd-roll-num mono">
                          R{rIdx + 1}
                        </span>
                      </div>
                      <div className="sd-roll-score mono">{subs}</div>
                      <div className="sd-roll-score mono">{tapped}</div>
                    </div>
                  );
                })}
                <div className="sd-totals">
                  <div className="t">
                    <div className="k">Subs</div>
                    <div className="v mono">{displaySubsFor}</div>
                  </div>
                  <div className="t">
                    <div className="k">Tapped</div>
                    <div className="v mono">{displaySubsAgainst}</div>
                  </div>
                  <div className="t">
                    <div className="k">Net</div>
                    <div
                      className="v mono"
                      style={{ color: net >= 0 ? "var(--ink)" : "#7a3028" }}
                    >
                      {net >= 0 ? "+" : ""}
                      {net}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {hasAnyNotes && (
            <section className="sd-section">
              <div className="sd-label">
                <span>Reflections</span>
              </div>
              {session.notes && (
                <div className="sd-notes-block">
                  <div className="sd-note-k">Notes</div>
                  <div className="sd-note-v">{session.notes}</div>
                </div>
              )}
              {session.insights.length > 0 && (
                <div className="sd-notes-block">
                  <div className="sd-note-k">Insights</div>
                  <div className="sd-note-v">
                    {session.insights.join(" · ")}
                  </div>
                </div>
              )}
              {session.goalsForNext.length > 0 && (
                <div className="sd-notes-block">
                  <div className="sd-note-k">Goals for next</div>
                  <div className="sd-note-v">
                    {session.goalsForNext.join(" · ")}
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="sd-footer">
            <button
              type="button"
              className="sd-action sd-action-danger"
              onClick={() => {
                if (
                  !window.confirm(
                    "Delete this session? This cannot be undone.",
                  )
                ) {
                  return;
                }
                deleteSession(session.id);
                router.push("/sessions");
              }}
            >
              Delete entry
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const css = `
  .sd-root {
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
  .sd-shell { max-width: 460px; margin: 0 auto; }
  .sd-root .mono { font-family: var(--font-ibm-plex-mono), ui-monospace, monospace; }
  .sd-hdr {
    padding: 22px 20px 14px;
    border-bottom: 1px solid var(--ink);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .sd-hdr h1 {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: 0;
  }
  .sd-hdr .no {
    font-size: 10px;
    letter-spacing: 0.12em;
    opacity: 0.5;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .sd-hdr-actions { display: flex; gap: 6px; }
  .sd-action {
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 8px 12px;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    text-decoration: none;
  }
  .sd-action-ghost:hover { background: rgba(26, 24, 21, 0.06); }
  .sd-action-primary {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .sd-action-primary:hover { background: var(--accent); border-color: var(--accent); }
  .sd-action-danger {
    border-color: #7a3028;
    color: #7a3028;
  }
  .sd-action-danger:hover { background: #7a3028; color: var(--bg); }
  .sd-section {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
  }
  .sd-label {
    font-size: 9.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .sd-label .num { font-variant-numeric: tabular-nums; }
  .sd-muted {
    font-size: 12px;
    color: rgba(26, 24, 21, 0.5);
    font-style: italic;
  }
  .sd-tbl { border-top: 1px solid var(--ink); }
  .sd-tbl-row {
    display: grid;
    grid-template-columns: 26px 1fr;
    gap: 6px;
    padding: 8px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .sd-tbl-row:first-child { border-top: none; }
  .sd-tbl-row .n {
    font-size: 10px;
    opacity: 0.4;
    padding-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  .sd-tbl-cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sd-tbl-pos {
    font-size: 11px;
    opacity: 0.6;
    letter-spacing: 0.02em;
  }
  .sd-tbl-tech {
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .sd-tbl-tech-empty { opacity: 0.4; font-style: italic; font-weight: 500; }
  .sd-cue {
    margin-top: 3px;
    padding: 6px 10px;
    background: var(--paper-yellow);
    border-left: 3px solid oklch(0.7 0.12 75);
    border-radius: 0 4px 4px 0;
    font-family: var(--font-ibm-plex-mono), ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #3a2e12;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }
  .sd-cue .pin {
    color: var(--accent);
    font-family: var(--font-inter), sans-serif;
    font-size: 11px;
  }
  .sd-cue-cues { font-weight: 500; }
  .sd-roll {
    display: grid;
    grid-template-columns: 18px 1fr auto auto;
    gap: 10px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .sd-roll:first-of-type { border-top: 1px solid var(--ink); }
  .sd-roll .belt-wrap {
    position: relative;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sd-roll .belt {
    width: 4px;
    height: 18px;
    border-radius: 1px;
    position: relative;
  }
  .sd-roll .belt::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 3px;
    height: 3px;
    background: rgba(0, 0, 0, 0.35);
  }
  .sd-roll-name {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .sd-roll-partner {
    font-size: 13px;
    font-weight: 500;
  }
  .sd-roll-num {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.45;
  }
  .sd-roll-score {
    min-width: 24px;
    text-align: right;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .sd-totals {
    display: flex;
    gap: 22px;
    padding-top: 12px;
    margin-top: 6px;
    border-top: 1px solid var(--ink);
  }
  .sd-totals .t { display: flex; flex-direction: column; gap: 2px; }
  .sd-totals .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .sd-totals .v {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .sd-notes-block {
    padding: 8px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .sd-notes-block:first-of-type { border-top: 1px solid var(--ink); }
  .sd-note-k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .sd-note-v {
    font-size: 12.5px;
    line-height: 1.5;
    color: rgba(26, 24, 21, 0.85);
  }
  .sd-footer {
    padding: 18px 20px 8px;
    display: flex;
    justify-content: center;
  }
  .sd-empty {
    padding: 40px 20px;
    text-align: center;
    color: rgba(26, 24, 21, 0.6);
  }
  .sd-empty p { margin: 0 0 14px; font-size: 13px; }
  .sd-back {
    display: inline-block;
    padding: 9px 14px;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: 1px solid var(--ink);
    color: var(--ink);
    text-decoration: none;
  }
  .sd-back:hover { background: var(--ink); color: var(--bg); }
`;
