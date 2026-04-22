"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/db/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
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

type PairDraft = {
  key: string;
  posId: string | null;
  posName: string;
  techId: string | null;
  techName: string;
  cues: string[];
};

type PartnerDraft = {
  key: string;
  name: string;
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

function emptyPartner(): PartnerDraft {
  return {
    key: createId(),
    name: "",
    belt: "white",
    subsFor: 0,
    subsAgainst: 0,
  };
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function formatSub(iso: string, classLabel: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${md} · ${classLabel}`;
}

function prevDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function LogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSessionId = searchParams.get("edit");

  const { user } = useAuth();
  const { sessions, getSessionById, addSession, updateSession } =
    useLocalSessions();
  const {
    positions: taxPositions,
    index: taxIndex,
    partnerSuggestions,
    addCustomPosition,
    addCustomTechnique,
    recordPartnerNames,
  } = useUserTaxonomy();

  const [date, setDate] = useState<string>(todayLocalISO());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [classIdx, setClassIdx] = useState<number>(0);
  const [pairs, setPairs] = useState<PairDraft[]>([]);
  const [partners, setPartners] = useState<PartnerDraft[]>([]);

  const [composerPos, setComposerPos] = useState<string>("");
  const [composerPosId, setComposerPosId] = useState<string | null>(null);
  const [composerTech, setComposerTech] = useState<string>("");
  const [composerTechId, setComposerTechId] = useState<string | null>(null);
  const [composerFocus, setComposerFocus] = useState<
    "pos" | "tech" | null
  >(null);

  const [openCueKey, setOpenCueKey] = useState<string | null>(null);
  const [cueDraft, setCueDraft] = useState<string>("");

  const [partnerDraft, setPartnerDraft] = useState<string>("");
  const [focusedPartnerKey, setFocusedPartnerKey] = useState<string | null>(
    null,
  );
  const [composerPartnerFocus, setComposerPartnerFocus] = useState(false);

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

    const rebuiltPairs: PairDraft[] = [];
    for (const t of existing.techniques) {
      const pos = t.positionId
        ? taxIndex.positionsById.get(t.positionId)
        : null;
      const tech = taxIndex.techniquesById.get(t.techniqueId);
      const cues = [...(t.keyDetails ?? [])];
      if (cues.length === 0 && t.notes?.trim()) {
        cues.push(t.notes.trim());
      }
      rebuiltPairs.push({
        key: t.id || createId(),
        posId: t.positionId,
        posName: pos?.name ?? "",
        techId: t.techniqueId,
        techName: tech?.name ?? "",
        cues: cues.slice(0, 2),
      });
    }
    for (const n of existing.positionNotes) {
      const pos = taxIndex.positionsById.get(n.positionId);
      const cues = [...(n.keyDetails ?? [])];
      if (cues.length === 0 && n.notes?.trim()) {
        cues.push(n.notes.trim());
      }
      rebuiltPairs.push({
        key: n.id || createId(),
        posId: n.positionId,
        posName: pos?.name ?? "",
        techId: null,
        techName: "",
        cues: cues.slice(0, 2),
      });
    }

    const rebuiltPartners: PartnerDraft[] = existing.sparringRounds.map((r) => ({
      key: r.id || createId(),
      name: r.partnerName ?? "",
      belt: (r.partnerBelt ?? "white") as BeltLevel,
      subsFor: r.submissionsForCount,
      subsAgainst: r.submissionsAgainstCount,
    }));

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating drafts from async-loaded session data.
    setClassIdx(classMatch >= 0 ? classMatch : 0);
    setPairs(rebuiltPairs);
    setPartners(rebuiltPartners);
  }, [editSessionId, getSessionById, taxIndex]);

  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;
    const dates = new Set(sessions.map((s) => s.date));
    let count = 0;
    let cursor = todayLocalISO();
    while (dates.has(cursor) && count < 400) {
      count += 1;
      cursor = prevDay(cursor);
    }
    if (count === 0) {
      cursor = prevDay(todayLocalISO());
      while (dates.has(cursor) && count < 400) {
        count += 1;
        cursor = prevDay(cursor);
      }
    }
    return count;
  }, [sessions]);

  const addCueToPair = useCallback((key: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPairs((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p;
        if (p.cues.length >= 2) return p;
        return { ...p, cues: [...p.cues, trimmed] };
      }),
    );
    setCueDraft("");
  }, []);

  const removeCue = (key: string, idx: number) => {
    setPairs((prev) =>
      prev.map((p) =>
        p.key === key
          ? { ...p, cues: p.cues.filter((_, i) => i !== idx) }
          : p,
      ),
    );
  };

  const removePair = (key: string) => {
    setPairs((prev) => prev.filter((p) => p.key !== key));
    if (openCueKey === key) setOpenCueKey(null);
  };

  const commitPair = () => {
    if (!composerPosId) return;
    const newPair: PairDraft = {
      key: createId(),
      posId: composerPosId,
      posName: composerPos,
      techId: composerTechId,
      techName: composerTechId ? composerTech : "",
      cues: [],
    };
    setPairs((prev) => [...prev, newPair]);
    setComposerPos("");
    setComposerPosId(null);
    setComposerTech("");
    setComposerTechId(null);
    setComposerFocus(null);
  };

  const cycleBelt = (key: string) => {
    setPartners((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p;
        const idx = BELT_ORDER.indexOf(p.belt);
        const next = BELT_ORDER[(idx + 1) % BELT_ORDER.length];
        return { ...p, belt: next };
      }),
    );
  };

  const bumpPartner = (
    key: string,
    field: "subsFor" | "subsAgainst",
    delta: number,
  ) => {
    setPartners((prev) =>
      prev.map((p) =>
        p.key === key
          ? { ...p, [field]: Math.max(0, p[field] + delta) }
          : p,
      ),
    );
  };

  const addPartner = () => {
    const name = partnerDraft.trim();
    if (!name) return;
    setPartners((prev) => [...prev, { ...emptyPartner(), name }]);
    setPartnerDraft("");
  };

  const positionSuggestions = useMemo(() => {
    if (composerFocus !== "pos") return [];
    return suggestPositions(taxPositions, composerPos, 8);
  }, [composerFocus, composerPos, taxPositions]);

  const techniqueSuggestions = useMemo(() => {
    if (composerFocus !== "tech") return [];
    return suggestTechniques(taxIndex, composerPosId, composerTech, 8);
  }, [composerFocus, composerTech, composerPosId, taxIndex]);

  const positionQuery = composerFocus === "pos" ? composerPos.trim() : "";
  const techniqueQuery = composerFocus === "tech" ? composerTech.trim() : "";
  const positionHasExact = positionSuggestions.some(
    (p) => p.name.toLowerCase() === positionQuery.toLowerCase(),
  );
  const techniqueHasExact = techniqueSuggestions.some(
    (t) => t.name.toLowerCase() === techniqueQuery.toLowerCase(),
  );
  const showAddPosition = positionQuery.length >= 2 && !positionHasExact;
  const showAddTechnique =
    techniqueQuery.length >= 2 &&
    !techniqueHasExact &&
    Boolean(composerPosId);

  const activePartnerQuery = focusedPartnerKey
    ? partners.find((p) => p.key === focusedPartnerKey)?.name.trim() ?? ""
    : "";

  const filteredPartnerSuggestions = useMemo(() => {
    if (!focusedPartnerKey && !composerPartnerFocus) return [];
    const query = composerPartnerFocus
      ? partnerDraft.trim().toLowerCase()
      : activePartnerQuery.toLowerCase();
    const existingNames = new Set(
      partners
        .filter((p) => p.key !== focusedPartnerKey)
        .map((p) => p.name.trim().toLowerCase())
        .filter(Boolean),
    );
    const candidates = partnerSuggestions.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );
    if (!query) return candidates.slice(0, 6);
    return candidates
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [
    focusedPartnerKey,
    composerPartnerFocus,
    partners,
    partnerSuggestions,
    partnerDraft,
    activePartnerQuery,
  ]);

  const handleAddCustomPosition = useCallback(
    (name: string) => {
      const pos = addCustomPosition({ name, parentId: null });
      if (!pos) return;
      setComposerPos(pos.name);
      setComposerPosId(pos.id);
      setComposerFocus("tech");
    },
    [addCustomPosition],
  );

  const handleAddCustomTechnique = useCallback(
    (name: string, positionId: string) => {
      const tech = addCustomTechnique({
        name,
        category: "submission",
        positionFromId: positionId,
      });
      if (!tech) return;
      setComposerTech(tech.name);
      setComposerTechId(tech.id);
      setComposerFocus(null);
    },
    [addCustomTechnique],
  );

  const canCommit = Boolean(composerPosId);
  const canSave =
    saving !== "saving" && pairs.length > 0 && Boolean(user);

  const cls = CLASS_TYPES[classIdx];
  const dayName = formatDay(date);
  const classLabel =
    cls.giOrNogi === "nogi"
      ? "No-Gi class"
      : cls.giOrNogi === "gi"
        ? "Gi class"
        : cls.sessionType === "competition"
          ? "Competition"
          : "Open mat";
  const subtitle = formatSub(date, classLabel);

  async function handleSave() {
    if (!user) {
      setSaveError("You need to be signed in.");
      setSaving("error");
      return;
    }
    setSaving("saving");
    setSaveError("");

    const nowIso = new Date().toISOString();
    const existing = existingSessionRef.current;
    const sessionId = existing?.id ?? createId();

    const techniques: SessionTechnique[] = [];
    const positionNotes: SessionPositionNote[] = [];
    for (const p of pairs) {
      if (!p.posId) continue;
      if (p.techId) {
        techniques.push({
          id: p.key,
          sessionId,
          positionId: p.posId,
          techniqueId: p.techId,
          keyDetails: p.cues,
          notes: "",
        });
      } else {
        positionNotes.push({
          id: p.key,
          sessionId,
          positionId: p.posId,
          keyDetails: p.cues,
          notes: "",
        });
      }
    }

    const sparringRounds: SparringRound[] = partners.map((p) => ({
      id: p.key,
      partnerName: p.name.trim() || null,
      partnerBelt: p.belt,
      submissionsFor: [],
      submissionsAgainst: [],
      submissionsForCount: p.subsFor,
      submissionsAgainstCount: p.subsAgainst,
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

    const partnerNames = partners
      .map((p) => p.name.trim())
      .filter(Boolean);
    if (partnerNames.length > 0) {
      recordPartnerNames(partnerNames, nowIso);
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
      const matched = matchExtraction(payload.extractedPayload, taxIndex);
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
    const newPairs: PairDraft[] = [];
    for (const t of matched.session.techniques) {
      const tm = t.techniqueMatch;
      const pm = t.positionMatch;
      if (!pm) continue;
      const cues = t.keyDetails.slice(0, 2);
      if (cues.length < 2 && t.notes?.trim()) {
        cues.push(t.notes.trim());
      }
      newPairs.push({
        key: createId(),
        posId: pm.item.id,
        posName: pm.item.name,
        techId: tm?.item.id ?? null,
        techName: tm?.item.name ?? "",
        cues: cues.slice(0, 2),
      });
    }
    for (const p of matched.session.positionNotes) {
      const pm = p.positionMatch;
      if (!pm) continue;
      const cues = p.keyDetails.slice(0, 2);
      if (cues.length < 2 && p.notes?.trim()) {
        cues.push(p.notes.trim());
      }
      newPairs.push({
        key: createId(),
        posId: pm.item.id,
        posName: pm.item.name,
        techId: null,
        techName: "",
        cues: cues.slice(0, 2),
      });
    }
    if (newPairs.length > 0) {
      setPairs((prev) => [...prev, ...newPairs]);
    }

    const newPartners: PartnerDraft[] = [];
    for (const r of matched.sparringRounds) {
      const belt: BeltLevel = BELT_ORDER.includes(r.partnerBelt as BeltLevel)
        ? (r.partnerBelt as BeltLevel)
        : "white";
      newPartners.push({
        key: createId(),
        name: r.partnerName,
        belt,
        subsFor: r.submissionsFor.length,
        subsAgainst: r.submissionsAgainst.length,
      });
    }
    if (newPartners.length > 0) {
      setPartners((prev) => [...prev, ...newPartners]);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="v2-root">
        <div className="v2-shell">
          <div className="top">
            <div className="top-left">
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="v2-date-hidden"
                aria-label="Session date"
              />
              <button
                type="button"
                className="v2-date-btn"
                onClick={() => {
                  const input = dateInputRef.current;
                  if (!input) return;
                  if (typeof input.showPicker === "function") {
                    input.showPicker();
                  } else {
                    input.focus();
                    input.click();
                  }
                }}
              >
                <span className="d">{dayName}.</span>
                <span className="sub">{subtitle}</span>
              </button>
            </div>
            <div className="top-right">
              <button
                className="v2-mic"
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
              <div className="streak">
                Streak
                <b>
                  {streak} {streak === 1 ? "day" : "days"}
                </b>
              </div>
            </div>
          </div>

          <div className="class-row">
            {CLASS_TYPES.map((c, i) => (
              <button
                key={c.label}
                className={`cls-chip ${i === classIdx ? "on" : ""}`}
                onClick={() => setClassIdx(i)}
                type="button"
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="section-title">Drilled</div>
          {pairs.length === 0 && (
            <div className="empty-row">
              No moves yet. Use the composer below.
            </div>
          )}
          {pairs.map((p) => {
            const target = p.techId && p.techName ? "tech" : "pos";
            const isOpen = openCueKey === p.key;
            return (
              <div className="pair-wrap" key={p.key}>
                <div className="pair">
                  <span className="pos">{p.posName || "—"}</span>
                  {p.techName && <span className="arr">→</span>}
                  <span className={`tech ${!p.techName ? "empty" : ""}`}>
                    {p.techName || "position note"}
                  </span>
                  <button
                    className={`cuebtn ${p.cues.length > 0 ? "has" : ""}`}
                    onClick={() => setOpenCueKey(isOpen ? null : p.key)}
                    title="Add cue"
                    type="button"
                    aria-label="Add cue"
                  >
                    {p.cues.length > 0 ? (
                      <span className="cnt">{p.cues.length}</span>
                    ) : (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      >
                        <path d="M6 2v8M2 6h8" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="x"
                    onClick={() => removePair(p.key)}
                    type="button"
                    aria-label="Remove move"
                  >
                    ×
                  </button>
                </div>
                {(p.cues.length > 0 || isOpen) && (
                  <div className="cues">
                    <div className="cue-attached">
                      <span>↳ cue on</span>
                      <span className={target === "tech" ? "t-tech" : "t-pos"}>
                        {target === "tech" ? p.techName : p.posName}
                      </span>
                    </div>
                    {p.cues.map((c, ci) => (
                      <div className="cue" key={ci}>
                        {c}
                        <button
                          className="rm"
                          onClick={() => removeCue(p.key, ci)}
                          type="button"
                          aria-label="Remove cue"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {isOpen && p.cues.length < 2 && (
                      <div className="cue-input">
                        <input
                          autoFocus
                          value={cueDraft}
                          onChange={(e) => setCueDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCueToPair(p.key, cueDraft);
                            }
                          }}
                          placeholder={
                            p.cues.length === 0
                              ? "first cue from class…"
                              : "one more…"
                          }
                        />
                        <button
                          type="button"
                          onClick={() => addCueToPair(p.key, cueDraft)}
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {isOpen && p.cues.length >= 2 && (
                      <div className="cue-full">
                        Max 2 cues · keep it tight
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="composer">
            <div className="field">
              <label>Position</label>
              <input
                value={composerPos}
                onFocus={() => setComposerFocus("pos")}
                onBlur={() =>
                  setTimeout(() => {
                    setComposerFocus((f) => (f === "pos" ? null : f));
                  }, 150)
                }
                onChange={(e) => {
                  setComposerPos(e.target.value);
                  setComposerPosId(null);
                }}
                placeholder="where you start…"
              />
            </div>
            <div className="field">
              <label>Technique</label>
              <input
                value={composerTech}
                onFocus={() => setComposerFocus("tech")}
                onBlur={() =>
                  setTimeout(() => {
                    setComposerFocus((f) => (f === "tech" ? null : f));
                  }, 150)
                }
                onChange={(e) => {
                  setComposerTech(e.target.value);
                  setComposerTechId(null);
                }}
                placeholder="what you apply (optional)…"
              />
            </div>
            {composerFocus === "pos" &&
              (positionSuggestions.length > 0 || showAddPosition) && (
                <div className="sugg">
                  {positionSuggestions.map((p) => (
                    <button
                      key={p.id}
                      className="chip"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setComposerPos(p.name);
                        setComposerPosId(p.id);
                        setComposerFocus("tech");
                      }}
                      type="button"
                    >
                      {p.name}
                    </button>
                  ))}
                  {showAddPosition && (
                    <button
                      className="chip chip-add"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleAddCustomPosition(composerPos)}
                      type="button"
                      title="Create a custom position"
                    >
                      + Add &ldquo;{composerPos}&rdquo;
                    </button>
                  )}
                </div>
              )}
            {composerFocus === "tech" && (
              <div className="sugg">
                {techniqueSuggestions.length === 0 && !showAddTechnique && (
                  <span className="sugg-hint">
                    Pick a position for suggestions, or leave technique empty.
                  </span>
                )}
                {techniqueSuggestions.map((t) => (
                  <button
                    key={t.id}
                    className="chip"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setComposerTech(t.name);
                      setComposerTechId(t.id);
                      if (!composerPosId) {
                        const pos = taxIndex.positionsById.get(
                          t.positionFromId,
                        );
                        if (pos) {
                          setComposerPos(pos.name);
                          setComposerPosId(pos.id);
                        }
                      }
                    }}
                    type="button"
                  >
                    {t.name}
                  </button>
                ))}
                {showAddTechnique && composerPosId && (
                  <button
                    className="chip chip-add"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      handleAddCustomTechnique(composerTech, composerPosId)
                    }
                    type="button"
                    title="Create a custom technique (default category: submission)"
                  >
                    + Add &ldquo;{composerTech}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            className="add-btn"
            onClick={commitPair}
            disabled={!canCommit}
            type="button"
          >
            + Log Move
          </button>

          <div className="section-title" style={{ marginTop: 14 }}>
            Rolls
          </div>
          {partners.map((p) => (
            <div className="partner" key={p.key}>
              <div className="row1">
                <div
                  className={`belt ${p.belt}`}
                  onClick={() => cycleBelt(p.key)}
                  title="Tap to cycle belt"
                />
                <input
                  className="nm"
                  value={p.name}
                  onChange={(e) =>
                    setPartners((prev) =>
                      prev.map((q) =>
                        q.key === p.key ? { ...q, name: e.target.value } : q,
                      ),
                    )
                  }
                  onFocus={() => setFocusedPartnerKey(p.key)}
                  onBlur={() =>
                    setTimeout(() => {
                      setFocusedPartnerKey((k) => (k === p.key ? null : k));
                    }, 150)
                  }
                  placeholder="Partner name"
                />
                <button
                  className="pr-x"
                  onClick={() =>
                    setPartners((prev) => prev.filter((q) => q.key !== p.key))
                  }
                  type="button"
                  aria-label="Remove partner"
                >
                  ×
                </button>
              </div>
              <div className="score">
                <div className="cell">
                  <div className="k">I subbed</div>
                  <div className="ctrl">
                    <button
                      onClick={() => bumpPartner(p.key, "subsFor", -1)}
                      type="button"
                    >
                      −
                    </button>
                    <div className="v">{p.subsFor}</div>
                    <button
                      onClick={() => bumpPartner(p.key, "subsFor", 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="cell">
                  <div className="k">Tapped</div>
                  <div className="ctrl">
                    <button
                      onClick={() => bumpPartner(p.key, "subsAgainst", -1)}
                      type="button"
                    >
                      −
                    </button>
                    <div className="v">{p.subsAgainst}</div>
                    <button
                      onClick={() => bumpPartner(p.key, "subsAgainst", 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              {focusedPartnerKey === p.key &&
                filteredPartnerSuggestions.length > 0 && (
                  <div className="partner-suggest">
                    {filteredPartnerSuggestions.map((name) => (
                      <button
                        key={name}
                        className="partner-chip"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPartners((prev) =>
                            prev.map((q) =>
                              q.key === p.key ? { ...q, name } : q,
                            ),
                          );
                          setFocusedPartnerKey(null);
                        }}
                        type="button"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          ))}
          <div className="pcompose">
            <div className="pcompose-field">
              <input
                value={partnerDraft}
                onChange={(e) => setPartnerDraft(e.target.value)}
                onFocus={() => setComposerPartnerFocus(true)}
                onBlur={() =>
                  setTimeout(() => setComposerPartnerFocus(false), 150)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPartner();
                  }
                }}
                placeholder="Add sparring partner…"
              />
              {composerPartnerFocus &&
                filteredPartnerSuggestions.length > 0 && (
                  <div className="partner-suggest partner-suggest-composer">
                    {filteredPartnerSuggestions.map((name) => (
                      <button
                        key={name}
                        className="partner-chip"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPartners((prev) => [
                            ...prev,
                            { ...emptyPartner(), name },
                          ]);
                          setPartnerDraft("");
                          setComposerPartnerFocus(false);
                        }}
                        type="button"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <button onClick={addPartner} type="button" aria-label="Add partner">
              +
            </button>
          </div>

          {saving === "error" && saveError && (
            <div className="v2-err">{saveError}</div>
          )}

          <button
            className="done"
            onClick={handleSave}
            disabled={!canSave}
            type="button"
          >
            {saving === "saving"
              ? "Saving…"
              : editSessionId
                ? "Update Session"
                : "Save Session"}
          </button>
        </div>
      </div>

      {voiceOpen && (
        <div
          className="v2-modal-scrim"
          onClick={() => !voiceBusy && setVoiceOpen(false)}
        >
          <div className="v2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="v2-modal-title">Paste class transcript</div>
            <p className="v2-modal-desc">
              Drop raw notes or a voice memo transcription. We&apos;ll extract
              positions, techniques, and rounds into the log below.
            </p>
            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Worked half-guard today. Hit a John Wayne sweep on Diego, drilled knee-tap…"
              rows={6}
              disabled={voiceBusy}
            />
            {voiceError && <div className="v2-err">{voiceError}</div>}
            <div className="v2-modal-row">
              <button
                className="cancel"
                type="button"
                onClick={() => setVoiceOpen(false)}
                disabled={voiceBusy}
              >
                Cancel
              </button>
              <button
                className="go"
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
  .v2-root {
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
    --paper-yellow: #fff9e4;
    font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
  .v2-shell { max-width: 460px; margin: 0 auto; }
  .v2-root .top {
    padding: 18px 18px 10px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .v2-root .top .d {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.03em;
    display: block;
  }
  .v2-root .top .sub {
    font-size: 11px;
    opacity: 0.55;
    margin-top: 2px;
    display: block;
  }
  .v2-root .top-left { position: relative; }
  .v2-date-hidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
    inset: 0;
  }
  .v2-root .v2-date-btn {
    background: transparent;
    border: none;
    color: inherit;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }
  .v2-root .v2-date-btn:hover .sub { color: var(--accent); opacity: 1; }
  .v2-root .top-right { display: flex; align-items: center; gap: 10px; }
  .v2-mic {
    border: 1px solid rgba(26, 24, 21, 0.2);
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
    flex-shrink: 0;
  }
  .v2-mic:hover { background: var(--ink); color: var(--bg); }
  .v2-root .streak {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    text-align: right;
  }
  .v2-root .streak b {
    display: block;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin-top: 2px;
    color: var(--accent);
  }
  .v2-root .class-row {
    display: flex;
    gap: 6px;
    padding: 4px 18px 10px;
    flex-wrap: wrap;
  }
  .v2-root .cls-chip {
    padding: 6px 10px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: inherit;
    border: 1px solid rgba(26, 24, 21, 0.15);
    background: #fff;
    color: var(--ink);
    border-radius: 999px;
    cursor: pointer;
  }
  .v2-root .cls-chip.on {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .v2-root .section-title {
    padding: 14px 18px 8px;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2-root .empty-row {
    margin: 0 14px 8px;
    padding: 14px;
    background: #fff;
    border: 1px dashed rgba(26, 24, 21, 0.15);
    border-radius: 10px;
    font-size: 12px;
    color: rgba(26, 24, 21, 0.55);
    text-align: center;
  }
  .v2-root .pair-wrap { margin: 0 14px 8px; }
  .v2-root .pair {
    background: #fff;
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(26, 24, 21, 0.06);
  }
  .v2-root .pair .arr { color: rgba(26, 24, 21, 0.3); font-size: 14px; }
  .v2-root .pair .pos {
    font-size: 12px;
    padding: 4px 9px;
    border-radius: 999px;
    background: rgba(26, 24, 21, 0.08);
    font-weight: 500;
    white-space: nowrap;
  }
  .v2-root .pair .tech {
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
    flex: 1;
    min-width: 0;
  }
  .v2-root .pair .tech.empty {
    font-weight: 500;
    opacity: 0.35;
    font-style: italic;
  }
  .v2-root .pair .cuebtn {
    width: 26px;
    height: 26px;
    border-radius: 13px;
    border: 1px solid rgba(26, 24, 21, 0.15);
    background: var(--cream);
    color: rgba(26, 24, 21, 0.55);
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .v2-root .pair .cuebtn.has {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }
  .v2-root .pair .cuebtn .cnt {
    font-size: 10px;
    font-weight: 700;
    font-family: var(--font-ibm-plex-mono), monospace;
    letter-spacing: -0.03em;
  }
  .v2-root .pair .x {
    width: 22px;
    height: 22px;
    border-radius: 11px;
    border: none;
    background: transparent;
    color: rgba(26, 24, 21, 0.4);
    cursor: pointer;
    font-size: 15px;
    flex-shrink: 0;
    font-family: inherit;
  }
  .v2-root .pair .x:hover { background: rgba(26, 24, 21, 0.08); color: var(--ink); }
  .v2-root .cues {
    margin-top: 4px;
    padding-left: 16px;
    position: relative;
  }
  .v2-root .cues::before {
    content: "";
    position: absolute;
    left: 4px;
    top: 2px;
    bottom: 8px;
    width: 2px;
    background: oklch(0.45 0.12 25 / 0.3);
    border-radius: 1px;
  }
  .v2-root .cue-attached {
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
  .v2-root .cue-attached .t-tech {
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
    font-size: 11px;
  }
  .v2-root .cue-attached .t-pos {
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    font-size: 11px;
    opacity: 0.85;
  }
  .v2-root .cue {
    background: var(--paper-yellow);
    border-left: 3px solid oklch(0.7 0.12 75);
    border-radius: 0 6px 6px 0;
    padding: 8px 28px 8px 10px;
    margin-bottom: 4px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #3a2e12;
    position: relative;
  }
  .v2-root .cue .rm {
    position: absolute;
    top: 50%;
    right: 4px;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: rgba(58, 46, 18, 0.5);
    cursor: pointer;
    width: 20px;
    height: 20px;
    border-radius: 10px;
    font-size: 13px;
    padding: 0;
    font-family: inherit;
    line-height: 1;
  }
  .v2-root .cue .rm:hover {
    background: rgba(58, 46, 18, 0.1);
    color: #3a2e12;
  }
  .v2-root .cue-input { display: flex; gap: 6px; margin-top: 4px; }
  .v2-root .cue-input input {
    flex: 1;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px dashed rgba(26, 24, 21, 0.25);
    background: transparent;
    font-size: 12px;
    font-family: var(--font-ibm-plex-mono), monospace;
    outline: none;
    color: inherit;
  }
  .v2-root .cue-input input:focus {
    border-style: solid;
    border-color: var(--accent);
    background: #fff;
  }
  .v2-root .cue-input button {
    padding: 0 12px;
    background: var(--ink);
    color: var(--bg);
    border: none;
    border-radius: 6px;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .v2-root .cue-full {
    font-size: 10px;
    opacity: 0.5;
    margin-top: 2px;
    padding-left: 2px;
  }
  .v2-root .composer {
    margin: 10px 14px;
    background: #fff;
    border: 1.5px solid var(--ink);
    border-radius: 10px;
    overflow: hidden;
  }
  .v2-root .composer .field {
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.08);
  }
  .v2-root .composer .field:last-child { border-bottom: none; }
  .v2-root .composer .field label {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
    width: 68px;
    flex-shrink: 0;
  }
  .v2-root .composer .field input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13.5px;
    font-family: inherit;
    outline: none;
    color: inherit;
    font-weight: 500;
    min-width: 0;
  }
  .v2-root .composer .field input::placeholder {
    color: rgba(26, 24, 21, 0.3);
    font-weight: 400;
  }
  .v2-root .sugg {
    padding: 8px 10px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    background: var(--cream);
  }
  .v2-root .sugg .chip {
    padding: 5px 10px;
    font-size: 11.5px;
    border-radius: 999px;
    border: 1px solid rgba(26, 24, 21, 0.15);
    background: #fff;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    font-weight: 500;
  }
  .v2-root .sugg .chip:hover {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .v2-root .sugg .chip.chip-add {
    border-style: dashed;
    border-color: var(--accent);
    color: var(--accent);
    background: transparent;
  }
  .v2-root .sugg .chip.chip-add:hover {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
    border-style: solid;
  }
  .v2-root .sugg-hint {
    font-size: 11px;
    opacity: 0.5;
    padding: 2px 4px;
  }
  .v2-root .add-btn {
    display: block;
    width: calc(100% - 28px);
    margin: 4px 14px 2px;
    padding: 11px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 10px;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .v2-root .add-btn:disabled {
    background: rgba(26, 24, 21, 0.15);
    color: rgba(26, 24, 21, 0.4);
    cursor: not-allowed;
  }
  .v2-root .partner {
    margin: 0 14px 8px;
    background: #fff;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid rgba(26, 24, 21, 0.06);
  }
  .v2-root .partner .row1 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .v2-root .partner .belt {
    width: 26px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
    position: relative;
    cursor: pointer;
  }
  .v2-root .partner .belt.blue { background: #2a4d7a; }
  .v2-root .partner .belt.purple { background: #4a2a6a; }
  .v2-root .partner .belt.brown { background: #5a3820; }
  .v2-root .partner .belt.white {
    background: #e8e2d5;
    border: 1px solid rgba(26, 24, 21, 0.2);
  }
  .v2-root .partner .belt.black { background: #1a1815; }
  .v2-root .partner .belt::after {
    content: "";
    position: absolute;
    right: 3px;
    top: 0;
    bottom: 0;
    width: 4px;
    background: rgba(0, 0, 0, 0.3);
  }
  .v2-root .partner .nm {
    font-weight: 600;
    font-size: 14px;
    letter-spacing: -0.01em;
    border: none;
    background: transparent;
    font-family: inherit;
    color: inherit;
    outline: none;
    flex: 1;
    min-width: 0;
    padding: 0;
  }
  .v2-root .partner .nm:focus { background: #fff; }
  .v2-root .partner .pr-x {
    width: 22px;
    height: 22px;
    border-radius: 11px;
    border: none;
    background: transparent;
    color: rgba(26, 24, 21, 0.4);
    cursor: pointer;
    font-size: 15px;
    flex-shrink: 0;
    font-family: inherit;
  }
  .v2-root .partner .pr-x:hover {
    background: rgba(26, 24, 21, 0.08);
    color: var(--ink);
  }
  .v2-root .partner .score {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .v2-root .partner .score .cell {
    background: var(--cream);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .v2-root .partner .score .cell .k {
    font-size: 9.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2-root .partner .score .cell .ctrl {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .v2-root .partner .score .cell button {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 10px;
    background: #fff;
    color: var(--ink);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 0;
    font-family: inherit;
  }
  .v2-root .partner .score .cell .v {
    font-size: 15px;
    font-weight: 600;
    min-width: 16px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .v2-root .partner-suggest {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px 10px;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
    background: var(--cream);
    border-radius: 0 0 12px 12px;
    margin: -1px 0 0;
  }
  .v2-root .partner-suggest-composer {
    margin: 6px 0 0;
    border: 1px solid rgba(26, 24, 21, 0.1);
    border-radius: 10px;
  }
  .v2-root .partner-chip {
    font-family: inherit;
    font-size: 11.5px;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid rgba(26, 24, 21, 0.15);
    background: #fff;
    color: var(--ink);
    cursor: pointer;
  }
  .v2-root .partner-chip:hover {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .v2-root .pcompose {
    margin: 6px 14px 18px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .v2-root .pcompose-field { flex: 1; position: relative; }
  .v2-root .pcompose-field input { width: 100%; }
  .v2-root .pcompose input {
    flex: 1;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px dashed rgba(26, 24, 21, 0.3);
    background: transparent;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    color: inherit;
  }
  .v2-root .pcompose input:focus {
    border-style: solid;
    border-color: var(--ink);
    background: #fff;
  }
  .v2-root .pcompose button {
    padding: 0 14px;
    background: transparent;
    border: 1px dashed rgba(26, 24, 21, 0.3);
    border-radius: 10px;
    font-size: 18px;
    cursor: pointer;
    font-family: inherit;
    color: var(--ink);
    width: 44px;
  }
  .v2-root .done {
    margin: 0 14px 20px;
    padding: 13px;
    background: var(--ink);
    color: var(--bg);
    border: none;
    border-radius: 10px;
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    width: calc(100% - 28px);
  }
  .v2-root .done:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .v2-err {
    margin: 0 14px 8px;
    padding: 10px 12px;
    border: 1px solid #7a3028;
    background: rgba(122, 48, 40, 0.08);
    color: #7a3028;
    font-size: 12px;
    border-radius: 8px;
  }
  .v2-modal-scrim {
    position: fixed;
    inset: 0;
    background: rgba(26, 24, 21, 0.55);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    overscroll-behavior: contain;
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
    font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .v2-modal {
    background: #fff;
    border-radius: 12px;
    width: 100%;
    max-width: 460px;
    padding: 18px 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--ink);
    border: 1px solid rgba(26, 24, 21, 0.12);
    box-shadow: 0 20px 60px rgba(26, 24, 21, 0.35);
  }
  .v2-modal-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .v2-modal-desc {
    margin: 0;
    font-size: 12px;
    opacity: 0.7;
    line-height: 1.4;
  }
  .v2-modal textarea {
    border: 1px solid rgba(26, 24, 21, 0.2);
    background: #fff;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    resize: vertical;
    color: inherit;
    outline: none;
  }
  .v2-modal textarea:focus { border-color: var(--ink); }
  .v2-modal-row { display: flex; gap: 10px; margin-top: 4px; }
  .v2-modal-row button {
    flex: 1;
    padding: 11px;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-family: inherit;
    cursor: pointer;
    border-radius: 10px;
    font-weight: 600;
  }
  .v2-modal-row .go {
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
  }
  .v2-modal-row .go:disabled { opacity: 0.5; cursor: default; }
  .v2-modal-row .cancel {
    background: transparent;
    color: var(--ink);
    border: 1px solid rgba(26, 24, 21, 0.3);
  }
  @media (min-width: 640px) {
    .v2-root { margin-top: -2.5rem; margin-bottom: -2.5rem; }
    .v2-shell { border-left: 1px solid rgba(26, 24, 21, 0.06); border-right: 1px solid rgba(26, 24, 21, 0.06); min-height: calc(100vh + 2.5rem); }
  }
`;
