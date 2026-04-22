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
        (inner, r) => inner + (r.submissionsForCount ?? r.submissionsFor.length),
        0,
      ),
    0,
  );
  const totalTapped = sessions.reduce(
    (acc, s) =>
      acc +
      s.sparringRounds.reduce(
        (inner, r) => inner + (r.submissionsAgainstCount ?? r.submissionsAgainst.length),
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
      <div className="sessions-root">
        <div className="sessions-shell">
          <div className="s-hdr">
            <div>
              <h1>Training Log</h1>
              <div className="no mono">
                {sessions.length} {sessions.length === 1 ? "entry" : "entries"}
              </div>
            </div>
            <Link href="/log" className="s-new">
              + New entry
            </Link>
          </div>

          <section className="s-totals">
            <div className="t">
              <div className="k">Sessions</div>
              <div className="v mono">{sessions.length}</div>
            </div>
            <div className="t">
              <div className="k">Rolls</div>
              <div className="v mono">{totalRounds}</div>
            </div>
            <div className="t">
              <div className="k">Subs</div>
              <div className="v mono">{totalSubs}</div>
            </div>
            <div className="t">
              <div className="k">Tapped</div>
              <div className="v mono">{totalTapped}</div>
            </div>
          </section>

          {sessions.length === 0 ? (
            <div className="s-empty">
              <p>No sessions yet.</p>
              <Link href="/log" className="s-empty-cta">
                Log your first
              </Link>
            </div>
          ) : (
            <div className="s-list">
              <div className="s-row s-row-head">
                <div className="s-col-num"></div>
                <div className="s-col-date">Date</div>
                <div className="s-col-body">Class</div>
                <div className="s-col-count">Tech</div>
                <div className="s-col-count">Net</div>
              </div>
              {sessions.map((session, i) => {
                const techCount = session.techniques.length;
                const roundCount = session.sparringRounds.length;
                const subs = session.sparringRounds.reduce(
                  (sum, r) =>
                    sum + (r.submissionsForCount ?? r.submissionsFor.length),
                  0,
                );
                const tapped = session.sparringRounds.reduce(
                  (sum, r) =>
                    sum + (r.submissionsAgainstCount ?? r.submissionsAgainst.length),
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
                const entryNum = String(sessions.length - i).padStart(4, "0");
                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="s-row s-row-body"
                  >
                    <div className="s-col-num mono">{entryNum}</div>
                    <div className="s-col-date mono">
                      {format(parseLocalDate(session.date), "MMM d")}
                    </div>
                    <div className="s-col-body">
                      <div className="s-cls">{classLabel}</div>
                      <div className="s-sub mono">
                        {displayRounds} {displayRounds === 1 ? "roll" : "rolls"}
                      </div>
                    </div>
                    <div className="s-col-count mono">{techCount}</div>
                    <div
                      className="s-col-count mono"
                      style={{
                        color: net >= 0 ? "var(--ink)" : "#7a3028",
                      }}
                    >
                      {net >= 0 ? "+" : ""}
                      {net}
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
  .sessions-root {
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
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
  }
  .sessions-shell { max-width: 460px; margin: 0 auto; }
  .sessions-root .mono { font-family: var(--font-ibm-plex-mono), ui-monospace, monospace; }
  .s-hdr {
    padding: 22px 20px 14px;
    border-bottom: 1px solid var(--ink);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .s-hdr h1 {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: 0;
  }
  .s-hdr .no {
    font-size: 10px;
    letter-spacing: 0.12em;
    opacity: 0.5;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .s-new {
    font-family: inherit;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 9px 14px;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: var(--bg);
    text-decoration: none;
    cursor: pointer;
  }
  .s-new:hover { background: var(--accent); border-color: var(--accent); }
  .s-totals {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .s-totals .t { display: flex; flex-direction: column; gap: 2px; }
  .s-totals .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .s-totals .v {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .s-list {
    padding: 0 20px;
    border-top: 1px solid var(--ink);
  }
  .s-row {
    display: grid;
    grid-template-columns: 38px 52px 1fr 34px 42px;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .s-row-head { border-top: none; }
  .s-row-head > div {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .s-row-body {
    text-decoration: none;
    color: inherit;
    cursor: pointer;
  }
  .s-row-body:hover {
    background: rgba(26, 24, 21, 0.03);
  }
  .s-col-num { font-size: 10px; opacity: 0.4; }
  .s-col-date { font-size: 11px; }
  .s-col-body .s-cls {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .s-col-body .s-sub {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .s-col-count {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .s-row-head .s-col-count { font-size: 9.5px; }
  .s-empty {
    margin: 24px 20px;
    padding: 24px;
    border: 1px dashed rgba(26, 24, 21, 0.25);
    text-align: center;
    color: rgba(26, 24, 21, 0.6);
  }
  .s-empty p { margin: 0 0 10px; font-size: 13px; }
  .s-empty-cta {
    display: inline-block;
    padding: 9px 14px;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: var(--bg);
    text-decoration: none;
  }
  .s-empty-cta:hover { background: var(--accent); border-color: var(--accent); }
`;
