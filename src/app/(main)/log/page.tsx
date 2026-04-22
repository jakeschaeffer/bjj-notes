"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/db/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { systemIndex } from "@/lib/taxonomy";
import {
  matchExtraction,
  type ExtractionPayload,
  type MatchedExtraction,
} from "@/lib/extraction/match-taxonomy";
import type {
  BeltLevel,
  GiNoGi,
  Session,
  SessionPositionNote,
  SessionTechnique,
  SessionType,
  SparringRound,
} from "@/lib/types";
import { createId, todayLocalISO } from "@/lib/utils";

import { suggestPositions, suggestTechniques } from "./_taxonomy-match";

type MoveDraft = {
  key: string;
  posId: string | null;
  posName: string;
  techId: string | null;
  techName: string;
  note: string;
};

type RoundDraft = {
  key: string;
  partnerName: string;
  belt: BeltLevel;
  subsFor: number;
  subsAgainst: number;
};

type ClassTypeOption = {
  label: string;
  sessionType: SessionType;
  giOrNogi: GiNoGi;
};

const CLASS_TYPES: ClassTypeOption[] = [
  { label: "Gi", sessionType: "regular-class", giOrNogi: "gi" },
  { label: "No-Gi", sessionType: "regular-class", giOrNogi: "nogi" },
  { label: "Open Mat", sessionType: "open-mat", giOrNogi: "both" },
  { label: "Comp", sessionType: "competition", giOrNogi: "both" },
];

const BELT_ORDER: BeltLevel[] = ["white", "blue", "purple", "brown", "black"];
const BELT_COLORS: Record<string, string> = {
  white: "#e8e2d5",
  blue: "#2a4d7a",
  purple: "#4a2a6a",
  brown: "#5a3820",
  black: "#1a1815",
  unknown: "#b8b0a0",
};

function emptyMove(): MoveDraft {
  return {
    key: createId(),
    posId: null,
    posName: "",
    techId: null,
    techName: "",
    note: "",
  };
}

function emptyRound(): RoundDraft {
  return {
    key: createId(),
    partnerName: "",
    belt: "white",
    subsFor: 0,
    subsAgainst: 0,
  };
}

function formatHeaderDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSessionId = searchParams.get("edit");

  const { user } = useAuth();
  const { sessions, getSessionById, addSession, updateSession } =
    useLocalSessions();

  const [date] = useState<string>(todayLocalISO());
  const [classIdx, setClassIdx] = useState<number>(0);
  const [moves, setMoves] = useState<MoveDraft[]>([emptyMove()]);
  const [rounds, setRounds] = useState<RoundDraft[]>([]);
  const [openNoteKey, setOpenNoteKey] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<
    | { moveKey: string; field: "pos" | "tech" }
    | null
  >(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string>("");

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string>("");

  const existingSessionRef = useRef<Session | null>(null);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editSessionId) {
      hydratedRef.current = null;
      existingSessionRef.current = null;
      return;
    }
    if (hydratedRef.current === editSessionId) {
      return;
    }
    const existing = getSessionById(editSessionId);
    if (!existing) {
      return;
    }
    hydratedRef.current = editSessionId;
    existingSessionRef.current = existing;

    const classMatch = CLASS_TYPES.findIndex(
      (c) =>
        c.sessionType === existing.sessionType &&
        c.giOrNogi === existing.giOrNogi,
    );

    const rebuiltMoves: MoveDraft[] = [];
    for (const t of existing.techniques) {
      const pos = t.positionId
        ? systemIndex.positionsById.get(t.positionId)
        : null;
      const tech = systemIndex.techniquesById.get(t.techniqueId);
      rebuiltMoves.push({
        key: t.id || createId(),
        posId: t.positionId,
        posName: pos?.name ?? "",
        techId: t.techniqueId,
        techName: tech?.name ?? "",
        note: t.notes ?? "",
      });
    }
    for (const n of existing.positionNotes) {
      const pos = systemIndex.positionsById.get(n.positionId);
      rebuiltMoves.push({
        key: n.id || createId(),
        posId: n.positionId,
        posName: pos?.name ?? "",
        techId: null,
        techName: "",
        note: n.notes ?? "",
      });
    }
    if (rebuiltMoves.length === 0) {
      rebuiltMoves.push(emptyMove());
    }

    const rebuiltRounds: RoundDraft[] = existing.sparringRounds.map((r) => ({
      key: r.id || createId(),
      partnerName: r.partnerName ?? "",
      belt: (r.partnerBelt ?? "white") as BeltLevel,
      subsFor: r.submissionsForCount,
      subsAgainst: r.submissionsAgainstCount,
    }));

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating drafts from async-loaded session data; the session arrives after mount via Supabase.
    setClassIdx(classMatch >= 0 ? classMatch : 0);
    setMoves(rebuiltMoves);
    setRounds(rebuiltRounds);
  }, [editSessionId, getSessionById]);

  const entryNumber = useMemo(() => {
    if (editSessionId) {
      const idx = sessions.findIndex((s) => s.id === editSessionId);
      if (idx >= 0) {
        return String(sessions.length - idx).padStart(4, "0");
      }
    }
    return String(sessions.length + 1).padStart(4, "0");
  }, [sessions, editSessionId]);

  const updateMove = useCallback(
    (key: string, patch: Partial<MoveDraft>) => {
      setMoves((prev) =>
        prev.map((m) => (m.key === key ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  const addMove = () => setMoves((prev) => [...prev, emptyMove()]);

  const cycleBelt = (key: string) => {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const idx = BELT_ORDER.indexOf(r.belt);
        const next = BELT_ORDER[(idx + 1) % BELT_ORDER.length];
        return { ...r, belt: next };
      }),
    );
  };

  const bumpRound = (key: string, field: "subsFor" | "subsAgainst", delta: number) => {
    setRounds((prev) =>
      prev.map((r) =>
        r.key === key
          ? { ...r, [field]: Math.max(0, r[field] + delta) }
          : r,
      ),
    );
  };

  const updateRound = (key: string, patch: Partial<RoundDraft>) => {
    setRounds((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  };

  const addRound = () => setRounds((prev) => [...prev, emptyRound()]);

  const targetForMove = (m: MoveDraft): "tech" | "pos" | null => {
    if (m.techId && m.techName) return "tech";
    if (m.posId && m.posName) return "pos";
    return null;
  };

  const totalSubs = rounds.reduce((a, r) => a + r.subsFor, 0);
  const totalSubbed = rounds.reduce((a, r) => a + r.subsAgainst, 0);
  const totalRounds = rounds.length;
  const noteCount = moves.filter((m) => m.note.trim()).length;
  const loggedCount = moves.filter(
    (m) => (m.posId && m.posName) || (m.techId && m.techName),
  ).length;

  const positionSuggestions = useMemo(() => {
    if (!focusedCell || focusedCell.field !== "pos") return [];
    const m = moves.find((x) => x.key === focusedCell.moveKey);
    if (!m) return [];
    return suggestPositions(m.posName, 6);
  }, [focusedCell, moves]);

  const techniqueSuggestions = useMemo(() => {
    if (!focusedCell || focusedCell.field !== "tech") return [];
    const m = moves.find((x) => x.key === focusedCell.moveKey);
    if (!m) return [];
    return suggestTechniques(m.techName, m.posId, 6);
  }, [focusedCell, moves]);

  async function handleSave() {
    if (!user) {
      setSaveError("You need to be signed in.");
      setSaving("error");
      return;
    }
    setSaving("saving");
    setSaveError("");

    const cls = CLASS_TYPES[classIdx];
    const nowIso = new Date().toISOString();
    const existing = existingSessionRef.current;
    const sessionId = existing?.id ?? createId();

    const techniques: SessionTechnique[] = [];
    const positionNotes: SessionPositionNote[] = [];
    for (const m of moves) {
      const hasPos = Boolean(m.posId);
      const hasTech = Boolean(m.techId);
      if (hasPos && hasTech) {
        techniques.push({
          id: m.key,
          sessionId,
          positionId: m.posId,
          techniqueId: m.techId!,
          keyDetails: [],
          notes: m.note.trim(),
        });
      } else if (hasPos && !hasTech) {
        positionNotes.push({
          id: m.key,
          sessionId,
          positionId: m.posId!,
          keyDetails: [],
          notes: m.note.trim(),
        });
      }
    }

    const sparringRounds: SparringRound[] = rounds.map((r) => ({
      id: r.key,
      partnerName: r.partnerName.trim() || null,
      partnerBelt: r.belt,
      submissionsFor: [],
      submissionsAgainst: [],
      submissionsForCount: r.subsFor,
      submissionsAgainstCount: r.subsAgainst,
      dominantPositions: [],
      stuckPositions: [],
      notes: "",
    }));

    const session: Session = {
      id: sessionId,
      userId: user.id,
      date,
      sessionType: cls.sessionType,
      giOrNogi: cls.giOrNogi,
      durationMinutes: existing?.durationMinutes ?? null,
      energyLevel: existing?.energyLevel ?? null,
      techniques,
      positionNotes,
      sparringRounds,
      notes: existing?.notes ?? "",
      insights: existing?.insights ?? [],
      goalsForNext: existing?.goalsForNext ?? [],
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };

    const result = existing
      ? await updateSession(session)
      : await addSession(session);

    if (!result.ok) {
      setSaving("error");
      setSaveError(result.error);
      return;
    }

    router.push("/sessions");
  }

  async function processVoicePaste() {
    if (!user || !voiceText.trim()) return;
    setVoiceBusy(true);
    setVoiceError("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setVoiceBusy(false);
      setVoiceError("Could not read your auth session.");
      return;
    }

    try {
      const res = await fetch("/api/transcripts/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: voiceText }),
      });
      if (!res.ok) {
        setVoiceBusy(false);
        setVoiceError(`Transcript failed (${res.status}).`);
        return;
      }
      const json = (await res.json()) as { extractionId?: string };
      if (!json.extractionId) {
        setVoiceBusy(false);
        setVoiceError("Extraction did not return an id.");
        return;
      }
      const extractionRes = await fetch(
        `/api/extractions/${json.extractionId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!extractionRes.ok) {
        setVoiceBusy(false);
        setVoiceError(`Extraction fetch failed (${extractionRes.status}).`);
        return;
      }
      const payload = (await extractionRes.json()) as {
        extractedPayload?: ExtractionPayload;
      };
      if (!payload.extractedPayload) {
        setVoiceBusy(false);
        setVoiceError("Extraction returned no data.");
        return;
      }
      const matched = matchExtraction(payload.extractedPayload, systemIndex);
      applyExtractionToDrafts(matched);
      setVoiceBusy(false);
      setVoiceOpen(false);
      setVoiceText("");
    } catch (err) {
      setVoiceBusy(false);
      setVoiceError(err instanceof Error ? err.message : "Failed.");
    }
  }

  function applyExtractionToDrafts(matched: MatchedExtraction) {
    const newMoves: MoveDraft[] = [];
    for (const t of matched.session.techniques) {
      const tm = t.techniqueMatch;
      const pm = t.positionMatch;
      if (!tm) continue;
      const note = t.notes?.trim() || t.keyDetails.join(", ");
      newMoves.push({
        key: createId(),
        posId: pm?.item.id ?? null,
        posName: pm?.item.name ?? t.positionName ?? "",
        techId: tm.item.id,
        techName: tm.item.name,
        note,
      });
    }
    for (const p of matched.session.positionNotes) {
      const pm = p.positionMatch;
      if (!pm) continue;
      const note = p.notes?.trim() || p.keyDetails.join(", ");
      newMoves.push({
        key: createId(),
        posId: pm.item.id,
        posName: pm.item.name,
        techId: null,
        techName: "",
        note,
      });
    }
    if (newMoves.length > 0) {
      setMoves((prev) => {
        const base = prev.filter(
          (m) => m.posName.trim() || m.techName.trim() || m.note.trim(),
        );
        return [...base, ...newMoves];
      });
    }

    const newRounds: RoundDraft[] = [];
    for (const r of matched.sparringRounds) {
      const belt: BeltLevel = BELT_ORDER.includes(r.partnerBelt as BeltLevel)
        ? (r.partnerBelt as BeltLevel)
        : "white";
      newRounds.push({
        key: createId(),
        partnerName: r.partnerName,
        belt,
        subsFor: r.submissionsFor.length,
        subsAgainst: r.submissionsAgainst.length,
      });
    }
    if (newRounds.length > 0) {
      setRounds((prev) => [...prev, ...newRounds]);
    }
  }

  const canSave = saving !== "saving" && loggedCount > 0;

  return (
    <>
      <style>{css}</style>
      <div className="v1-root">
        <div className="v1-shell">
          <div className="v1-hdr">
            <div>
              <h1>Training Ledger</h1>
              <div className="no mono">Entry № {entryNumber}</div>
            </div>
            <div className="v1-hdr-right">
              <button
                className="v1-mic"
                aria-label="Paste class transcript"
                title="Paste class transcript"
                onClick={() => setVoiceOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="1.5" width="4" height="7" rx="2" />
                  <path d="M3 7v0.5a4 4 0 008 0V7" />
                  <path d="M7 12v0.5" />
                </svg>
              </button>
              <div className="date mono">{formatHeaderDate(date)}</div>
            </div>
          </div>

          <section>
            <div className="label">
              <span>Class</span>
              <span className="mono">Gi · No-Gi · Open Mat</span>
            </div>
            <div className="v1-cls">
              {CLASS_TYPES.map((c, i) => (
                <button
                  key={c.label}
                  className={i === classIdx ? "on" : ""}
                  onClick={() => setClassIdx(i)}
                  type="button"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="label">
              <span>Moves Drilled</span>
              <span className="num mono">
                {loggedCount} logged · {noteCount} noted
              </span>
            </div>
            <div className="tbl">
              <div className="row head">
                <div className="cell-h" />
                <div className="cell-h">Position</div>
                <div className="cell-h">Technique</div>
                <div className="cell-h pencil">✎</div>
              </div>
              {moves.map((m, i) => {
                const target = targetForMove(m);
                const isOpen = openNoteKey === m.key;
                const rowFocused =
                  focusedCell?.moveKey === m.key && focusedCell.field;
                return (
                  <div key={m.key}>
                    <div className="row">
                      <div className="n mono">{String(i + 1).padStart(2, "0")}</div>
                      <input
                        className="mono"
                        value={m.posName}
                        placeholder="Closed Guard…"
                        onChange={(e) =>
                          updateMove(m.key, {
                            posName: e.target.value,
                            posId: null,
                          })
                        }
                        onFocus={() =>
                          setFocusedCell({ moveKey: m.key, field: "pos" })
                        }
                        onBlur={() =>
                          setTimeout(() => {
                            setFocusedCell((c) =>
                              c?.moveKey === m.key && c.field === "pos"
                                ? null
                                : c,
                            );
                          }, 150)
                        }
                      />
                      <input
                        className="mono"
                        value={m.techName}
                        placeholder="Hip Bump Sweep…"
                        onChange={(e) =>
                          updateMove(m.key, {
                            techName: e.target.value,
                            techId: null,
                          })
                        }
                        onFocus={() =>
                          setFocusedCell({ moveKey: m.key, field: "tech" })
                        }
                        onBlur={() =>
                          setTimeout(() => {
                            setFocusedCell((c) =>
                              c?.moveKey === m.key && c.field === "tech"
                                ? null
                                : c,
                            );
                          }, 150)
                        }
                      />
                      <button
                        className={`notebtn ${m.note ? "has" : ""}`}
                        onClick={() =>
                          setOpenNoteKey(isOpen ? null : m.key)
                        }
                        disabled={!target}
                        style={{
                          opacity: target ? 1 : 0.25,
                          cursor: target ? "pointer" : "default",
                        }}
                        title={
                          target
                            ? `Note on ${target === "tech" ? "technique" : "position"}`
                            : "Enter a position first"
                        }
                        type="button"
                        aria-label="Toggle note"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        >
                          <path d="M2 3h8M2 6h8M2 9h5" />
                        </svg>
                      </button>
                    </div>
                    {rowFocused === "pos" && positionSuggestions.length > 0 && (
                      <div className="sugg-row">
                        {positionSuggestions.map((p) => (
                          <button
                            key={p.id}
                            className="sugg-chip"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              updateMove(m.key, {
                                posName: p.name,
                                posId: p.id,
                              })
                            }
                            type="button"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {rowFocused === "tech" &&
                      techniqueSuggestions.length > 0 && (
                        <div className="sugg-row">
                          {techniqueSuggestions.map((t) => (
                            <button
                              key={t.id}
                              className="sugg-chip"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                updateMove(m.key, {
                                  techName: t.name,
                                  techId: t.id,
                                  posId:
                                    m.posId ??
                                    (t.positionFromId || null),
                                  posName:
                                    m.posName ||
                                    systemIndex.positionsById.get(
                                      t.positionFromId,
                                    )?.name ||
                                    "",
                                })
                              }
                              type="button"
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    {isOpen && target && (
                      <div className="noterow">
                        <div className="target">
                          <span className="pin">↳</span>
                          <span>cue attached to</span>
                          <span
                            className={target === "tech" ? "t-tech" : "t-pos"}
                          >
                            {target === "tech" ? m.techName : m.posName}
                          </span>
                        </div>
                        <textarea
                          autoFocus
                          value={m.note}
                          placeholder="thumb up · elbow tight · hip escape before framing"
                          onChange={(e) =>
                            updateMove(m.key, { note: e.target.value })
                          }
                          onBlur={() => {
                            if (!m.note) setOpenNoteKey(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="addrow" onClick={addMove} type="button">
              + Add row
            </button>
          </section>

          <section>
            <div className="label">
              <span>Sparring Rounds</span>
              <span className="num mono">{totalRounds} rolls</span>
            </div>
            {rounds.length > 0 && (
              <div className="roll head">
                <span />
                <span>Partner</span>
                <span>Subs</span>
                <span>Tapped</span>
              </div>
            )}
            {rounds.map((r) => (
              <div className="roll" key={r.key}>
                <div className="belt-wrap">
                  <div
                    className="belt"
                    style={{ background: BELT_COLORS[r.belt] }}
                    onClick={() => cycleBelt(r.key)}
                    title="Tap to cycle belt"
                  />
                </div>
                <input
                  className="partner mono"
                  value={r.partnerName}
                  placeholder="name"
                  onChange={(e) =>
                    updateRound(r.key, { partnerName: e.target.value })
                  }
                />
                <div className="score">
                  <button onClick={() => bumpRound(r.key, "subsFor", -1)} type="button">−</button>
                  <div className="v mono">{r.subsFor}</div>
                  <button onClick={() => bumpRound(r.key, "subsFor", 1)} type="button">+</button>
                </div>
                <div className="score">
                  <button onClick={() => bumpRound(r.key, "subsAgainst", -1)} type="button">−</button>
                  <div className="v mono">{r.subsAgainst}</div>
                  <button onClick={() => bumpRound(r.key, "subsAgainst", 1)} type="button">+</button>
                </div>
              </div>
            ))}
            <button className="addrow" onClick={addRound} type="button">
              + Add round
            </button>

            {rounds.length > 0 && (
              <div className="totals">
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
                  <div className="v mono">{totalSubbed}</div>
                </div>
                <div className="t">
                  <div className="k">Net</div>
                  <div
                    className="v mono"
                    style={{
                      color:
                        totalSubs >= totalSubbed ? "#1a1815" : "#7a3028",
                    }}
                  >
                    {totalSubs - totalSubbed >= 0 ? "+" : ""}
                    {totalSubs - totalSubbed}
                  </div>
                </div>
              </div>
            )}
          </section>

          {saving === "error" && saveError && (
            <div className="v1-err">{saveError}</div>
          )}

          <div className="submit">
            <button
              className="draft"
              type="button"
              onClick={() => router.push("/sessions")}
            >
              Cancel
            </button>
            <button
              className="save"
              type="button"
              onClick={handleSave}
              disabled={!canSave}
            >
              {saving === "saving"
                ? "Saving…"
                : editSessionId
                  ? "Update Entry"
                  : "Close Entry"}
            </button>
          </div>
        </div>
      </div>

      {voiceOpen && (
        <div
          className="v1-modal-scrim"
          onClick={() => !voiceBusy && setVoiceOpen(false)}
        >
          <div className="v1-modal" onClick={(e) => e.stopPropagation()}>
            <div className="v1-modal-title">Paste class transcript</div>
            <p className="v1-modal-desc">
              Drop raw notes or a voice memo transcription. We&apos;ll extract
              positions, techniques, and rounds into the ledger below.
            </p>
            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Worked half-guard today. Hit a John Wayne sweep on Diego, drilled knee-tap…"
              rows={6}
              disabled={voiceBusy}
            />
            {voiceError && <div className="v1-err">{voiceError}</div>}
            <div className="v1-modal-row">
              <button
                className="draft"
                type="button"
                onClick={() => setVoiceOpen(false)}
                disabled={voiceBusy}
              >
                Cancel
              </button>
              <button
                className="save"
                type="button"
                onClick={processVoicePaste}
                disabled={voiceBusy || !voiceText.trim()}
              >
                {voiceBusy ? "Extracting…" : "Extract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
  .v1-root {
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
    font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--ink);
    background: var(--bg);
    min-height: 100vh;
    margin-left: -1.5rem;
    margin-right: -1.5rem;
    margin-top: -2.5rem;
    margin-bottom: -2.5rem;
    padding-bottom: 2rem;
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
  }
  .v1-shell { max-width: 440px; margin: 0 auto; }
  .v1-root .mono { font-family: var(--font-ibm-plex-mono), ui-monospace, "SF Mono", Menlo, monospace; }
  .v1-hdr {
    padding: 22px 20px 14px;
    border-bottom: 1px solid var(--ink);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .v1-hdr h1 {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: 0;
  }
  .v1-hdr .no {
    font-size: 10px;
    letter-spacing: 0.12em;
    opacity: 0.5;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .v1-hdr-right { display: flex; align-items: center; gap: 10px; }
  .v1-hdr .date { font-size: 11px; letter-spacing: 0.05em; opacity: 0.65; }
  .v1-mic {
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: transparent;
    color: var(--ink);
    width: 28px;
    height: 28px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }
  .v1-mic:hover { background: var(--ink); color: var(--bg); }
  .v1-root section {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
  }
  .v1-root .label {
    font-size: 9.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .v1-root .label .num { font-variant-numeric: tabular-nums; }
  .v1-cls { display: flex; gap: 6px; margin-top: 4px; }
  .v1-cls button {
    flex: 1;
    padding: 8px 0;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: inherit;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .v1-cls button.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .v1-root .tbl { border-top: 1px solid var(--ink); }
  .v1-root .row {
    display: grid;
    grid-template-columns: 20px 1fr 1fr 26px;
    align-items: stretch;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .v1-root .row.head { border-top: none; }
  .v1-root .row .n {
    font-size: 10px;
    opacity: 0.4;
    padding: 10px 0 8px 2px;
    font-variant-numeric: tabular-nums;
  }
  .v1-root .row input {
    border: none;
    background: transparent;
    padding: 10px 6px 9px;
    font-size: 12.5px;
    font-family: inherit;
    color: inherit;
    width: 100%;
    outline: none;
    border-left: 1px dotted rgba(26, 24, 21, 0.2);
    min-width: 0;
  }
  .v1-root .row input:focus { background: #fff; position: relative; z-index: 1; }
  .v1-root .row input::placeholder { color: rgba(26, 24, 21, 0.3); font-style: italic; }
  .v1-root .row .cell-h {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    padding: 8px 6px;
    border-left: 1px dotted rgba(26, 24, 21, 0.2);
  }
  .v1-root .row .cell-h:first-of-type { border-left: none; }
  .v1-root .row .cell-h.pencil { text-align: center; padding: 8px 0; }
  .v1-root .notebtn {
    border: none;
    background: transparent;
    border-left: 1px dotted rgba(26, 24, 21, 0.2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(26, 24, 21, 0.35);
    font-family: inherit;
    padding: 0;
    position: relative;
  }
  .v1-root .notebtn:hover { color: var(--ink); background: rgba(26, 24, 21, 0.04); }
  .v1-root .notebtn.has { color: var(--accent); }
  .v1-root .notebtn.has::after {
    content: "";
    position: absolute;
    top: 6px;
    right: 6px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent);
  }
  .v1-root .sugg-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 10px 8px 22px;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
    background: #fff;
  }
  .v1-root .sugg-chip {
    font-family: inherit;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(26, 24, 21, 0.15);
    background: var(--cream);
    color: var(--ink);
    cursor: pointer;
  }
  .v1-root .sugg-chip:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .v1-root .noterow {
    border-top: 1px solid rgba(26, 24, 21, 0.08);
    background: var(--cream);
    padding: 8px 10px 10px 22px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .v1-root .noterow .target {
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .v1-root .noterow .target .pin { color: var(--accent); }
  .v1-root .noterow .target .t-tech,
  .v1-root .noterow .target .t-pos {
    letter-spacing: 0;
    text-transform: none;
    font-size: 11px;
    font-weight: 600;
    opacity: 1;
  }
  .v1-root .noterow .target .t-tech { color: var(--accent); font-weight: 700; }
  .v1-root .noterow textarea {
    border: none;
    background: transparent;
    resize: none;
    width: 100%;
    outline: none;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12px;
    line-height: 1.45;
    color: var(--ink);
    padding: 0;
    min-height: 36px;
  }
  .v1-root .noterow textarea::placeholder {
    color: rgba(26, 24, 21, 0.35);
    font-style: italic;
  }
  .v1-root .addrow {
    padding: 10px 0 2px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.5;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
  }
  .v1-root .addrow:hover { opacity: 1; }
  .v1-root .roll {
    display: grid;
    grid-template-columns: 18px 1fr auto auto;
    gap: 10px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .v1-root .roll.head {
    border-top: 1px solid var(--ink);
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .v1-root .roll.head span {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .v1-root .roll .belt-wrap {
    position: relative;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .v1-root .roll .belt {
    width: 4px;
    height: 18px;
    border-radius: 1px;
    position: relative;
    cursor: pointer;
  }
  .v1-root .roll .belt::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 3px;
    height: 3px;
    background: rgba(0, 0, 0, 0.35);
  }
  .v1-root .roll input.partner {
    border: none;
    background: transparent;
    font-size: 13px;
    font-family: inherit;
    color: inherit;
    outline: none;
    padding: 2px 0;
    font-weight: 500;
  }
  .v1-root .roll input.partner:focus { background: #fff; }
  .v1-root .score { display: flex; align-items: center; gap: 5px; }
  .v1-root .score button {
    width: 18px;
    height: 18px;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: var(--bg);
    color: var(--ink);
    border-radius: 0;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    padding: 0;
    font-family: inherit;
  }
  .v1-root .score button:hover { background: var(--ink); color: var(--bg); }
  .v1-root .score .v {
    min-width: 14px;
    text-align: center;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .v1-root .totals {
    display: flex;
    gap: 24px;
    padding-top: 12px;
    margin-top: 6px;
    border-top: 1px solid var(--ink);
  }
  .v1-root .totals .t { display: flex; flex-direction: column; gap: 2px; }
  .v1-root .totals .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .v1-root .totals .v {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .v1-root .submit {
    padding: 14px 20px 22px;
    display: flex;
    gap: 10px;
  }
  .v1-root .submit button {
    flex: 1;
    padding: 13px;
    font-size: 10.5px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-family: inherit;
    cursor: pointer;
  }
  .v1-root .submit .save {
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
  }
  .v1-root .submit .save:disabled { opacity: 0.5; cursor: default; }
  .v1-root .submit .draft {
    background: transparent;
    color: var(--ink);
    border: 1px solid rgba(26, 24, 21, 0.4);
  }
  .v1-err {
    margin: 0 20px;
    padding: 10px 12px;
    border: 1px solid #7a3028;
    background: rgba(122, 48, 40, 0.08);
    color: #7a3028;
    font-size: 12px;
    border-radius: 4px;
  }
  .v1-modal-scrim {
    position: fixed;
    inset: 0;
    background: rgba(26, 24, 21, 0.5);
    z-index: 50;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 16px;
  }
  .v1-modal {
    background: var(--bg);
    border: 1px solid var(--ink);
    border-radius: 4px;
    width: 100%;
    max-width: 440px;
    padding: 18px 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--ink);
  }
  .v1-modal-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .v1-modal-desc {
    margin: 0;
    font-size: 12px;
    opacity: 0.7;
    line-height: 1.4;
  }
  .v1-modal textarea {
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: #fff;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12px;
    padding: 10px 12px;
    border-radius: 2px;
    resize: vertical;
    color: inherit;
    outline: none;
  }
  .v1-modal textarea:focus { border-color: var(--ink); }
  .v1-modal-row { display: flex; gap: 10px; margin-top: 4px; }
  .v1-modal-row button {
    flex: 1;
    padding: 11px;
    font-size: 10.5px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-family: inherit;
    cursor: pointer;
    border-radius: 0;
  }
  .v1-modal-row .save {
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
  }
  .v1-modal-row .save:disabled { opacity: 0.5; cursor: default; }
  .v1-modal-row .draft {
    background: transparent;
    color: var(--ink);
    border: 1px solid rgba(26, 24, 21, 0.4);
  }
  @media (min-width: 640px) {
    .v1-root { margin-top: -2.5rem; margin-bottom: -2.5rem; }
    .v1-shell { border-left: 1px solid rgba(26, 24, 21, 0.08); border-right: 1px solid rgba(26, 24, 21, 0.08); min-height: calc(100vh + 2.5rem); }
  }
`;
