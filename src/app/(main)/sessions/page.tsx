"use client";

import Link from "next/link";
import { format } from "date-fns";

import { parseLocalDate } from "@/lib/utils";
import { useLocalSessions } from "@/hooks/use-local-sessions";

export default function SessionsPage() {
  const { sessions } = useLocalSessions();

  const totalSubs = sessions.reduce(
    (acc, s) =>
      acc +
      s.sparringRounds.reduce(
        (inner, r) =>
          inner + (r.submissionsForCount ?? r.submissionsFor.length),
        0,
      ),
    0,
  );
  const totalTapped = sessions.reduce(
    (acc, s) =>
      acc +
      s.sparringRounds.reduce(
        (inner, r) =>
          inner + (r.submissionsAgainstCount ?? r.submissionsAgainst.length),
        0,
      ),
    0,
  );
  const totalRounds = sessions.reduce(
    (acc, s) => acc + s.sparringRounds.length,
    0,
  );

  return (
    <>
      <style>{css}</style>
      <div className="v2s-root">
        <div className="v2s-shell">
          <div className="top">
            <div>
              <div className="d">Sessions.</div>
              <div className="sub">
                {sessions.length} {sessions.length === 1 ? "entry" : "entries"}{" "}
                · {totalRounds} rolls
              </div>
            </div>
            <Link href="/log" className="v2s-new">
              + New
            </Link>
          </div>

          <div className="v2s-totals">
            <div className="v2s-cell">
              <div className="k">Subs</div>
              <div className="v">{totalSubs}</div>
            </div>
            <div className="v2s-cell">
              <div className="k">Tapped</div>
              <div className="v">{totalTapped}</div>
            </div>
            <div className="v2s-cell">
              <div className="k">Net</div>
              <div
                className="v"
                style={{
                  color: totalSubs - totalTapped >= 0 ? "inherit" : "#7a3028",
                }}
              >
                {totalSubs - totalTapped >= 0 ? "+" : ""}
                {totalSubs - totalTapped}
              </div>
            </div>
          </div>

          <div className="section-title">Recent</div>

          {sessions.length === 0 ? (
            <div className="v2s-empty">
              <p>No sessions yet.</p>
              <Link href="/log" className="v2s-empty-cta">
                + Log your first
              </Link>
            </div>
          ) : (
            <div className="v2s-list">
              {sessions.map((session) => {
                const techCount = session.techniques.length;
                const posNoteCount = session.positionNotes.length;
                const roundCount = session.sparringRounds.length;
                const subs = session.sparringRounds.reduce(
                  (sum, r) =>
                    sum + (r.submissionsForCount ?? r.submissionsFor.length),
                  0,
                );
                const tapped = session.sparringRounds.reduce(
                  (sum, r) =>
                    sum +
                    (r.submissionsAgainstCount ?? r.submissionsAgainst.length),
                  0,
                );
                const net = subs - tapped;
                const useLegacy = roundCount === 0 && session.legacySparring;
                const displayRounds = useLegacy
                  ? session.legacySparring?.rounds ?? 0
                  : roundCount;
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
                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="v2s-card"
                  >
                    <div className="v2s-card-head">
                      <div>
                        <div className="v2s-card-day">
                          {format(
                            parseLocalDate(session.date),
                            "EEEE",
                          )}
                          .
                        </div>
                        <div className="v2s-card-sub">
                          {format(parseLocalDate(session.date), "MMM d")} ·{" "}
                          {classLabel}
                        </div>
                      </div>
                      <div
                        className="v2s-card-net"
                        style={{ color: net >= 0 ? "inherit" : "#7a3028" }}
                      >
                        {net >= 0 ? "+" : ""}
                        {net}
                      </div>
                    </div>
                    <div className="v2s-card-stats">
                      <span className="v2s-chip">
                        {techCount + posNoteCount}{" "}
                        {techCount + posNoteCount === 1 ? "move" : "moves"}
                      </span>
                      {displayRounds > 0 && (
                        <span className="v2s-chip">
                          {displayRounds}{" "}
                          {displayRounds === 1 ? "roll" : "rolls"}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const css = `
  .v2s-root {
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
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
  .v2s-shell { max-width: 460px; margin: 0 auto; }
  .v2s-root .top {
    padding: 18px 18px 10px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .v2s-root .top .d {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.03em;
  }
  .v2s-root .top .sub {
    font-size: 11px;
    opacity: 0.55;
    margin-top: 2px;
  }
  .v2s-new {
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 9px 14px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 999px;
    text-decoration: none;
  }
  .v2s-new:hover { background: var(--ink); }
  .v2s-totals {
    margin: 0 14px 6px;
    padding: 12px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid rgba(26, 24, 21, 0.06);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .v2s-cell {
    background: var(--cream);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .v2s-cell .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2s-cell .v {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .section-title {
    padding: 14px 18px 8px;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2s-list {
    margin: 0 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .v2s-card {
    background: #fff;
    border-radius: 12px;
    padding: 12px 14px;
    border: 1px solid rgba(26, 24, 21, 0.06);
    text-decoration: none;
    color: inherit;
    transition: transform 0.1s, border-color 0.1s;
  }
  .v2s-card:hover {
    border-color: rgba(26, 24, 21, 0.2);
    transform: translateY(-1px);
  }
  .v2s-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .v2s-card-day {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .v2s-card-sub {
    font-size: 11px;
    opacity: 0.55;
    margin-top: 2px;
  }
  .v2s-card-net {
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .v2s-card-stats {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .v2s-chip {
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(26, 24, 21, 0.07);
    font-weight: 500;
  }
  .v2s-empty {
    margin: 0 14px 16px;
    padding: 32px 20px;
    background: #fff;
    border: 1px dashed rgba(26, 24, 21, 0.2);
    border-radius: 12px;
    text-align: center;
    color: rgba(26, 24, 21, 0.6);
  }
  .v2s-empty p { margin: 0 0 12px; font-size: 13px; }
  .v2s-empty-cta {
    display: inline-block;
    padding: 10px 16px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    background: var(--accent);
    color: var(--bg);
    border-radius: 999px;
    text-decoration: none;
  }
`;
