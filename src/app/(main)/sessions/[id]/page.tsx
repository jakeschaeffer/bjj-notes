"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { parseLocalDate } from "@/lib/utils";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";

const BELT_LABELS: Record<string, string> = {
  white: "White",
  blue: "Blue",
  purple: "Purple",
  brown: "Brown",
  black: "Black",
  unknown: "Unknown",
};

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getSessionById, deleteSession } = useLocalSessions();
  const { index } = useUserTaxonomy();
  const sessionId = params?.id;
  const session = sessionId ? getSessionById(sessionId) : undefined;

  if (!session) {
    return (
      <>
        <style>{css}</style>
        <div className="v2sd-root">
          <div className="v2sd-shell">
            <div className="top">
              <div>
                <div className="d">Not found.</div>
                <div className="sub">No entry matches that id</div>
              </div>
            </div>
            <div className="v2sd-empty">
              <p>That session does not exist or has been deleted.</p>
              <Link href="/sessions" className="v2sd-back">
                ← Back to sessions
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

  const dayName = format(parseLocalDate(session.date), "EEEE");
  const subtitleLabel =
    session.giOrNogi === "gi"
      ? "Gi class"
      : session.giOrNogi === "nogi"
        ? "No-Gi class"
        : session.sessionType === "competition"
          ? "Competition"
          : "Open mat";
  const subtitle = `${format(parseLocalDate(session.date), "MMM d")} · ${subtitleLabel}`;

  const hasAnyNotes =
    session.notes ||
    session.insights.length > 0 ||
    session.goalsForNext.length > 0;

  return (
    <>
      <style>{css}</style>
      <div className="v2sd-root">
        <div className="v2sd-shell">
          <div className="top">
            <div>
              <div className="d">{dayName}.</div>
              <div className="sub">{subtitle}</div>
            </div>
            <div className="top-actions">
              <Link href="/sessions" className="v2sd-chip-btn">
                ← Back
              </Link>
              <Link
                href={`/log?edit=${session.id}`}
                className="v2sd-chip-btn v2sd-chip-btn-primary"
              >
                Edit
              </Link>
            </div>
          </div>

          <div className="section-title">Drilled</div>
          {session.techniques.length === 0 &&
          session.positionNotes.length === 0 ? (
            <div className="v2sd-muted">No moves logged.</div>
          ) : (
            <>
              {session.techniques.map((t) => {
                const pos = t.positionId
                  ? index.positionsById.get(t.positionId)
                  : null;
                const tech = index.techniquesById.get(t.techniqueId);
                const cues = t.keyDetails ?? [];
                const effectiveCues =
                  cues.length === 0 && t.notes?.trim() ? [t.notes.trim()] : cues;
                return (
                  <div className="pair-wrap" key={t.id}>
                    <div className="pair">
                      <span className="pos">{pos?.name ?? "—"}</span>
                      <span className="arr">→</span>
                      <span className="tech">
                        {tech?.name ?? "Unknown technique"}
                      </span>
                    </div>
                    {effectiveCues.length > 0 && (
                      <div className="cues">
                        <div className="cue-attached">
                          <span>↳ cue on</span>
                          <span className="t-tech">
                            {tech?.name ?? "—"}
                          </span>
                        </div>
                        {effectiveCues.map((c, i) => (
                          <div className="cue" key={i}>
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {session.positionNotes.map((n) => {
                const pos = index.positionsById.get(n.positionId);
                const cues = n.keyDetails ?? [];
                const effectiveCues =
                  cues.length === 0 && n.notes?.trim() ? [n.notes.trim()] : cues;
                return (
                  <div className="pair-wrap" key={n.id}>
                    <div className="pair">
                      <span className="pos">{pos?.name ?? "—"}</span>
                      <span className="tech tech-empty">position note</span>
                    </div>
                    {effectiveCues.length > 0 && (
                      <div className="cues">
                        <div className="cue-attached">
                          <span>↳ cue on</span>
                          <span className="t-pos">{pos?.name ?? "—"}</span>
                        </div>
                        {effectiveCues.map((c, i) => (
                          <div className="cue" key={i}>
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          <div className="section-title" style={{ marginTop: 14 }}>
            Rolls
          </div>
          {displayRounds === 0 ? (
            <div className="v2sd-muted">No sparring rounds logged.</div>
          ) : (
            <>
              {session.sparringRounds.map((r) => {
                const subs = r.submissionsForCount ?? r.submissionsFor.length;
                const tapped =
                  r.submissionsAgainstCount ?? r.submissionsAgainst.length;
                const beltKey = r.partnerBelt ?? "unknown";
                return (
                  <div className="partner" key={r.id}>
                    <div className="row1">
                      <div className={`belt ${beltKey}`} />
                      <div className="nm">
                        {r.partnerName || "Partner unknown"}
                      </div>
                      <div className="bltlbl">{BELT_LABELS[beltKey]}</div>
                    </div>
                    <div className="score">
                      <div className="cell">
                        <div className="k">I subbed</div>
                        <div className="v">{subs}</div>
                      </div>
                      <div className="cell">
                        <div className="k">Tapped</div>
                        <div className="v">{tapped}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="v2sd-totals">
                <div className="v2sd-cell">
                  <div className="k">Subs</div>
                  <div className="v">{displaySubsFor}</div>
                </div>
                <div className="v2sd-cell">
                  <div className="k">Tapped</div>
                  <div className="v">{displaySubsAgainst}</div>
                </div>
                <div className="v2sd-cell">
                  <div className="k">Net</div>
                  <div
                    className="v"
                    style={{ color: net >= 0 ? "inherit" : "#7a3028" }}
                  >
                    {net >= 0 ? "+" : ""}
                    {net}
                  </div>
                </div>
              </div>
            </>
          )}

          {hasAnyNotes && (
            <>
              <div className="section-title" style={{ marginTop: 14 }}>
                Reflections
              </div>
              <div className="reflections">
                {session.notes && (
                  <div className="reflection-block">
                    <div className="reflection-k">Notes</div>
                    <div className="reflection-v">{session.notes}</div>
                  </div>
                )}
                {session.insights.length > 0 && (
                  <div className="reflection-block">
                    <div className="reflection-k">Insights</div>
                    <div className="reflection-v">
                      {session.insights.join(" · ")}
                    </div>
                  </div>
                )}
                {session.goalsForNext.length > 0 && (
                  <div className="reflection-block">
                    <div className="reflection-k">Goals for next</div>
                    <div className="reflection-v">
                      {session.goalsForNext.join(" · ")}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="v2sd-footer">
            <button
              type="button"
              className="v2sd-delete"
              onClick={() => {
                if (
                  !window.confirm("Delete this session? This cannot be undone.")
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
  .v2sd-root {
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
    -webkit-font-smoothing: antialiased;
  }
  .v2sd-shell { max-width: 460px; margin: 0 auto; }
  .v2sd-root .top {
    padding: 18px 18px 10px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .v2sd-root .top .d {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.03em;
  }
  .v2sd-root .top .sub {
    font-size: 11px;
    opacity: 0.55;
    margin-top: 2px;
  }
  .top-actions { display: flex; gap: 6px; }
  .v2sd-chip-btn {
    font-family: inherit;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid rgba(26, 24, 21, 0.2);
    background: transparent;
    color: var(--ink);
    text-decoration: none;
    cursor: pointer;
  }
  .v2sd-chip-btn:hover { background: rgba(26, 24, 21, 0.06); }
  .v2sd-chip-btn-primary {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .v2sd-chip-btn-primary:hover { background: var(--accent); border-color: var(--accent); }
  .section-title {
    padding: 14px 18px 8px;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2sd-muted {
    margin: 0 14px 8px;
    padding: 14px;
    background: #fff;
    border: 1px dashed rgba(26, 24, 21, 0.15);
    border-radius: 10px;
    font-size: 12px;
    color: rgba(26, 24, 21, 0.55);
    text-align: center;
  }
  .pair-wrap { margin: 0 14px 8px; }
  .pair {
    background: #fff;
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(26, 24, 21, 0.06);
  }
  .pair .pos {
    font-size: 12px;
    padding: 4px 9px;
    border-radius: 999px;
    background: rgba(26, 24, 21, 0.08);
    font-weight: 500;
    white-space: nowrap;
  }
  .pair .arr { color: rgba(26, 24, 21, 0.3); font-size: 14px; }
  .pair .tech {
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
    flex: 1;
    min-width: 0;
  }
  .pair .tech.tech-empty {
    font-weight: 500;
    opacity: 0.4;
    font-style: italic;
  }
  .cues {
    margin-top: 4px;
    padding-left: 16px;
    position: relative;
  }
  .cues::before {
    content: "";
    position: absolute;
    left: 4px;
    top: 2px;
    bottom: 2px;
    width: 2px;
    background: oklch(0.45 0.12 25 / 0.3);
    border-radius: 1px;
  }
  .cue-attached {
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
    margin: 4px 0 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cue-attached .t-tech {
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
    font-size: 11px;
  }
  .cue-attached .t-pos {
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    font-size: 11px;
    opacity: 0.85;
  }
  .cue {
    background: var(--paper-yellow);
    border-left: 3px solid oklch(0.7 0.12 75);
    border-radius: 0 6px 6px 0;
    padding: 8px 10px;
    margin-bottom: 4px;
    font-family: var(--font-ibm-plex-mono), ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #3a2e12;
  }
  .partner {
    margin: 0 14px 8px;
    background: #fff;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid rgba(26, 24, 21, 0.06);
  }
  .partner .row1 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .partner .belt {
    width: 26px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
    position: relative;
  }
  .partner .belt.blue { background: #2a4d7a; }
  .partner .belt.purple { background: #4a2a6a; }
  .partner .belt.brown { background: #5a3820; }
  .partner .belt.white { background: #e8e2d5; border: 1px solid rgba(26, 24, 21, 0.2); }
  .partner .belt.black { background: #1a1815; }
  .partner .belt.unknown { background: #b8b0a0; }
  .partner .belt::after {
    content: "";
    position: absolute;
    right: 3px;
    top: 0;
    bottom: 0;
    width: 4px;
    background: rgba(0, 0, 0, 0.3);
  }
  .partner .nm {
    font-weight: 600;
    font-size: 14px;
    letter-spacing: -0.01em;
    flex: 1;
    min-width: 0;
  }
  .partner .bltlbl {
    font-size: 10px;
    opacity: 0.55;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .partner .score {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .partner .score .cell {
    background: var(--cream);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .partner .score .cell .k {
    font-size: 9.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .partner .score .cell .v {
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .v2sd-totals {
    margin: 6px 14px 0;
    padding: 12px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid rgba(26, 24, 21, 0.06);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .v2sd-cell {
    background: var(--cream);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .v2sd-cell .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2sd-cell .v {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .reflections { margin: 0 14px; }
  .reflection-block {
    padding: 10px 12px;
    background: #fff;
    border: 1px solid rgba(26, 24, 21, 0.06);
    border-radius: 10px;
    margin-bottom: 6px;
  }
  .reflection-k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
    margin-bottom: 3px;
  }
  .reflection-v {
    font-size: 12.5px;
    line-height: 1.5;
    color: rgba(26, 24, 21, 0.85);
  }
  .v2sd-footer {
    padding: 20px 14px 8px;
    display: flex;
    justify-content: center;
  }
  .v2sd-delete {
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid rgba(122, 48, 40, 0.4);
    background: transparent;
    color: #7a3028;
    cursor: pointer;
  }
  .v2sd-delete:hover { background: #7a3028; color: var(--bg); border-color: #7a3028; }
  .v2sd-empty {
    margin: 0 14px;
    padding: 40px 20px;
    background: #fff;
    border: 1px dashed rgba(26, 24, 21, 0.2);
    border-radius: 12px;
    text-align: center;
    color: rgba(26, 24, 21, 0.6);
  }
  .v2sd-empty p { margin: 0 0 14px; font-size: 13px; }
  .v2sd-back {
    display: inline-block;
    padding: 10px 16px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    background: var(--ink);
    color: var(--bg);
    border-radius: 999px;
    text-decoration: none;
  }
`;
