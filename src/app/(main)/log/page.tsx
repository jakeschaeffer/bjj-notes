"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";

import { PositionPicker } from "@/components/positions/position-picker";
import { TechniquePicker } from "@/components/techniques/technique-picker";
import { TagPicker } from "@/components/techniques/tag-picker";
import {
  ExtractionReviewPanel,
  type UnmatchedItem,
} from "@/components/extraction/extraction-review-panel";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/db/supabase/client";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useAuth } from "@/hooks/use-auth";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import { COMMON_TAGS, normalizeTag } from "@/lib/taxonomy/tags";
import {
  matchExtraction,
  type ExtractionPayload,
  type MatchedExtraction,
} from "@/lib/extraction/match-taxonomy";
import type {
  BeltLevel,
  RoundSubmission,
  Session,
  SessionPositionNote,
  SessionTechnique,
  SparringRound,
  Technique,
} from "@/lib/types";
import { createId } from "@/lib/utils";

const sessionTypes = [
  "regular-class",
  "open-mat",
  "private",
  "competition",
  "seminar",
  "drilling-only",
] as const;

type DraftTechnique = {
  id: string;
  positionId: string | null;
  techniqueId: string | null;
  keyDetails: string[];
  notes: string;
  expanded: boolean;
  notesExpanded: boolean;
};

type DraftRound = {
  id: string;
  partnerName: string;
  partnerBelt: BeltLevel | null;
  submissionsFor: RoundSubmission[];
  submissionsAgainst: RoundSubmission[];
  submissionsForCount: number;
  submissionsAgainstCount: number;
  dominantPositions: string[];
  stuckPositions: string[];
  notes: string;
  notesExpanded: boolean;
};

function createDraftTechnique(): DraftTechnique {
  return {
    id: createId(),
    positionId: null,
    techniqueId: null,
    keyDetails: [],
    notes: "",
    expanded: false,
    notesExpanded: false,
  };
}

function createDraftRound(): DraftRound {
  return {
    id: createId(),
    partnerName: "",
    partnerBelt: null,
    submissionsFor: [],
    submissionsAgainst: [],
    submissionsForCount: 0,
    submissionsAgainstCount: 0,
    dominantPositions: [],
    stuckPositions: [],
    notes: "",
    notesExpanded: false,
  };
}

const beltOptions: Array<{
  value: BeltLevel;
  label: string;
  dotClass: string;
}> = [
  { value: "white", label: "White belt", dotClass: "bg-slate-50 border-slate-300" },
  { value: "blue", label: "Blue belt", dotClass: "bg-blue-500 border-blue-600" },
  { value: "purple", label: "Purple belt", dotClass: "bg-purple-500 border-purple-600" },
  { value: "brown", label: "Brown belt", dotClass: "bg-amber-700 border-amber-800" },
  { value: "black", label: "Black belt", dotClass: "bg-zinc-900 border-zinc-950" },
  { value: "unknown", label: "Unknown", dotClass: "bg-zinc-200 border-zinc-300" },
];

const commonSubmissionIds = [
  "rear-naked-choke",
  "triangle-choke",
  "armbar-from-guard",
  "armbar-from-mount",
  "kimura",
  "americana",
  "guillotine",
  "heel-hook",
];

const ambiguousSubmissions: Record<string, string[]> = {
  kimura: ["guard.closed", "side-control.standard", "side-control.north-south", "guard.half"],
  "triangle-choke": ["guard.closed", "mount"],
  guillotine: ["standing", "guard.closed"],
  omoplata: ["guard.closed", "guard.open"],
};

const sparringDominantPositions = [
  { id: "back-control", label: "Back Control" },
  { id: "mount", label: "Mount" },
  { id: "side-control", label: "Side Control" },
  { id: "knee-on-belly", label: "Knee on Belly" },
  { id: "side-control.north-south", label: "North South" },
];

const sparringStuckPositions = [
  { id: "bottom-side-control", label: "Bottom Side Control" },
  { id: "bottom-mount", label: "Bottom Mount" },
  { id: "back-exposed", label: "Back Exposed" },
  { id: "turtle", label: "Turtle" },
  { id: "guard", label: "Guard (bottom)" },
];

function buildTagSuggestions(technique: Technique | null, userTags: string[]) {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  const addTags = (tags: string[] | undefined) => {
    if (!tags) {
      return;
    }
    for (const tag of tags) {
      const normalized = normalizeTag(tag);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      suggestions.push(normalized);
    }
  };

  addTags(technique?.keyDetails);
  addTags(userTags);
  addTags(COMMON_TAGS);

  return suggestions;
}

function getRecentIds<T>(
  items: T[],
  extractId: (item: T) => string | null,
  max: number,
) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const id = extractId(item);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
    if (result.length >= max) {
      break;
    }
  }

  return result;
}

export default function LogSessionPage() {
  const { sessions, addSession } = useLocalSessions();
  const { user } = useAuth();
  const {
    index,
    tagSuggestions,
    partnerSuggestions,
    addCustomPosition,
    addCustomTechnique,
    recordTagUsage,
    recordTechniqueProgress,
    recordPartnerNames,
  } = useUserTaxonomy();

  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [sessionType, setSessionType] = useState<
    (typeof sessionTypes)[number]
  >(sessionTypes[0]);
  const [giOrNogi, setGiOrNogi] = useState<"gi" | "nogi" | "both">("gi");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [insights, setInsights] = useState("");
  const [goalsForNext, setGoalsForNext] = useState("");
  const [techniqueDrafts, setTechniqueDrafts] = useState<DraftTechnique[]>([
    createDraftTechnique(),
  ]);
  const [roundDrafts, setRoundDrafts] = useState<DraftRound[]>([]);
  const [beltPickerRoundId, setBeltPickerRoundId] = useState<string | null>(null);
  const [submissionPicker, setSubmissionPicker] = useState<{
    roundId: string;
    side: "for" | "against";
  } | null>(null);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [ambiguousSubmission, setAmbiguousSubmission] = useState<{
    roundId: string;
    side: "for" | "against";
    techniqueId: string;
  } | null>(null);
  const [positionPickerTarget, setPositionPickerTarget] = useState<{
    roundId: string;
    type: "dominant" | "stuck";
  } | null>(null);
  const [positionSearch, setPositionSearch] = useState("");
  const [customSubmissionTarget, setCustomSubmissionTarget] = useState<{
    roundId: string;
    side: "for" | "against";
  } | null>(null);
  const [customSubmissionName, setCustomSubmissionName] = useState("");
  const [customSubmissionPositionId, setCustomSubmissionPositionId] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioStatus, setAudioStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [audioMessage, setAudioMessage] = useState("");
  const [audioResult, setAudioResult] = useState<{
    transcriptId: string;
    extractionId: string;
  } | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptStatus, setTranscriptStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [transcriptMessage, setTranscriptMessage] = useState("");
  const [debugTranscriptInput, setDebugTranscriptInput] = useState("");
  const [debugStatus, setDebugStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [debugMessage, setDebugMessage] = useState("");
  const [matchedExtraction, setMatchedExtraction] = useState<MatchedExtraction | null>(null);
  const [rawExtraction, setRawExtraction] = useState<ExtractionPayload | null>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [createUnmatchedItem, setCreateUnmatchedItem] = useState<UnmatchedItem | null>(null);
  const [showExtractionDebug, setShowExtractionDebug] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  const recentPositionIds = useMemo(() => {
    return getRecentIds(
      sessions.flatMap((session) => [
        ...session.techniques,
        ...session.positionNotes,
      ]),
      (entry) => entry.positionId,
      5,
    );
  }, [sessions]);

  const recentTechniqueIds = useMemo(() => {
    return getRecentIds(
      sessions.flatMap((session) => session.techniques),
      (technique) => technique.techniqueId,
      5,
    );
  }, [sessions]);

  const submissionTechniques = useMemo(
    () => index.techniques.filter((technique) => technique.category === "submission"),
    [index.techniques],
  );

  const submissionSearchIndex = useMemo(() => {
    return new Fuse(submissionTechniques, {
      keys: ["name", "aliases"],
      threshold: 0.3,
      includeScore: true,
    });
  }, [submissionTechniques]);

  const recentSubmissionIds = useMemo(() => {
    return getRecentIds(
      sessions.flatMap((session) =>
        session.sparringRounds.flatMap((round) => [
          ...round.submissionsFor,
          ...round.submissionsAgainst,
        ]),
      ),
      (submission) => submission.techniqueId,
      5,
    );
  }, [sessions]);

  const commonSubmissions = useMemo(() => {
    const list: Technique[] = [];
    for (const id of commonSubmissionIds) {
      const technique = index.techniquesById.get(id);
      if (technique) {
        list.push(technique);
      }
    }
    return list;
  }, [index.techniquesById]);

  const recentSubmissions = useMemo(() => {
    const list: Technique[] = [];
    for (const id of recentSubmissionIds) {
      const technique = index.techniquesById.get(id);
      if (technique) {
        list.push(technique);
      }
    }
    return list;
  }, [index.techniquesById, recentSubmissionIds]);

  const submissionResults = useMemo(() => {
    const query = submissionSearch.trim();
    if (!query) {
      return [];
    }
    return submissionSearchIndex.search(query).map((result) => result.item);
  }, [submissionSearch, submissionSearchIndex]);

  const submissionList = useMemo(() => {
    return [...submissionTechniques].sort((a, b) => a.name.localeCompare(b.name));
  }, [submissionTechniques]);

  function updateTechnique(id: string, update: Partial<DraftTechnique>) {
    setTechniqueDrafts((prev) =>
      prev.map((technique) =>
        technique.id === id ? { ...technique, ...update } : technique,
      ),
    );
  }

  function addTechnique() {
    setTechniqueDrafts((prev) => [...prev, createDraftTechnique()]);
  }

  function removeTechnique(id: string) {
    setTechniqueDrafts((prev) => prev.filter((technique) => technique.id !== id));
  }

  function updateRound(id: string, update: Partial<DraftRound>) {
    setRoundDrafts((prev) =>
      prev.map((round) => (round.id === id ? { ...round, ...update } : round)),
    );
  }

  function addRound() {
    setRoundDrafts((prev) => [...prev, createDraftRound()]);
  }

  function removeRound(id: string) {
    const round = roundDrafts.find((item) => item.id === id);
    if (!round) {
      return;
    }

    const hasData =
      round.partnerName.trim() ||
      round.partnerBelt ||
      round.submissionsFor.length > 0 ||
      round.submissionsAgainst.length > 0 ||
      round.dominantPositions.length > 0 ||
      round.stuckPositions.length > 0 ||
      round.notes.trim();

    if (hasData && !window.confirm("Remove this round?")) {
      return;
    }

    setRoundDrafts((prev) => prev.filter((item) => item.id !== id));
  }

  function toggleRoundPosition(
    roundId: string,
    type: "dominant" | "stuck",
    positionId: string,
  ) {
    setRoundDrafts((prev) =>
      prev.map((round) => {
        if (round.id !== roundId) {
          return round;
        }
        const key = type === "dominant" ? "dominantPositions" : "stuckPositions";
        const list = round[key];
        const next = list.includes(positionId)
          ? list.filter((item) => item !== positionId)
          : [...list, positionId];
        return {
          ...round,
          [key]: next,
        };
      }),
    );
  }

  function openSubmissionPicker(roundId: string, side: "for" | "against") {
    setSubmissionPicker({ roundId, side });
    setSubmissionSearch("");
  }

  function incrementSubmissionCount(roundId: string, side: "for" | "against") {
    setRoundDrafts((prev) =>
      prev.map((round) => {
        if (round.id !== roundId) {
          return round;
        }
        const countKey =
          side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
        return {
          ...round,
          [countKey]: round[countKey] + 1,
        };
      }),
    );
  }

  function decrementSubmissionCount(roundId: string, side: "for" | "against") {
    setRoundDrafts((prev) =>
      prev.map((round) => {
        if (round.id !== roundId) {
          return round;
        }
        const countKey =
          side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
        const listKey = side === "for" ? "submissionsFor" : "submissionsAgainst";
        if (round[countKey] === 0) {
          return round;
        }

        const nextCount = round[countKey] - 1;
        if (nextCount < round[listKey].length) {
          const message =
            round[listKey].length === 1
              ? "Clear the logged submission?"
              : "Reduce the count and remove a submission detail?";
          if (!window.confirm(message)) {
            return round;
          }
          return {
            ...round,
            [countKey]: nextCount,
            [listKey]: round[listKey].slice(0, nextCount),
          };
        }

        return {
          ...round,
          [countKey]: nextCount,
        };
      }),
    );
  }

  function removeSubmission(roundId: string, side: "for" | "against", id: string) {
    setRoundDrafts((prev) =>
      prev.map((round) => {
        if (round.id !== roundId) {
          return round;
        }
        const listKey = side === "for" ? "submissionsFor" : "submissionsAgainst";
        const countKey =
          side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
        const next = round[listKey].filter((item) => item.id !== id);
        const nextCount =
          round[countKey] === round[listKey].length
            ? Math.max(0, round[countKey] - 1)
            : round[countKey];
        return {
          ...round,
          [listKey]: next,
          [countKey]: Math.max(nextCount, next.length),
        };
      }),
    );
  }

  function handleSubmissionSelect(
    roundId: string,
    side: "for" | "against",
    techniqueId: string,
  ) {
    const ambiguousPositions = ambiguousSubmissions[techniqueId];
    if (ambiguousPositions?.length) {
      setAmbiguousSubmission({ roundId, side, techniqueId });
      setSubmissionPicker(null);
      setSubmissionSearch("");
      return;
    }

    const submission: RoundSubmission = {
      id: createId(),
      techniqueId,
      positionId: null,
    };

    setRoundDrafts((prev) =>
      prev.map((round) => {
        if (round.id !== roundId) {
          return round;
        }
        const listKey = side === "for" ? "submissionsFor" : "submissionsAgainst";
        const countKey =
          side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
        const nextList = [...round[listKey], submission];
        return {
          ...round,
          [listKey]: nextList,
          [countKey]: Math.max(round[countKey], nextList.length),
        };
      }),
    );
    setSubmissionPicker(null);
    setSubmissionSearch("");
  }

  function handleAmbiguousPositionSelect(positionId: string | null) {
    if (!ambiguousSubmission) {
      return;
    }
    const { roundId, side, techniqueId } = ambiguousSubmission;
    const submission: RoundSubmission = {
      id: createId(),
      techniqueId,
      positionId,
    };

    setRoundDrafts((prev) =>
      prev.map((round) => {
        if (round.id !== roundId) {
          return round;
        }
        const listKey = side === "for" ? "submissionsFor" : "submissionsAgainst";
        const countKey =
          side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
        const nextList = [...round[listKey], submission];
        return {
          ...round,
          [listKey]: nextList,
          [countKey]: Math.max(round[countKey], nextList.length),
        };
      }),
    );
    setAmbiguousSubmission(null);
  }

  async function handleAudioUpload() {
    if (!audioFile) {
      setAudioStatus("error");
      setAudioMessage("Choose an audio file to upload.");
      return;
    }

    if (!user) {
      setAudioStatus("error");
      setAudioMessage("You need to be signed in to upload audio.");
      return;
    }

    setAudioStatus("uploading");
    setAudioMessage("");
    setAudioResult(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setAudioStatus("error");
      setAudioMessage("Could not read your auth session. Try again.");
      return;
    }

    const form = new FormData();
    form.append("file", audioFile);
    form.append("source", "audio_upload");

    try {
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const contentType = response.headers.get("content-type") ?? "";
      let result:
        | { id: string; extractionId: string; status?: string }
        | { error: string }
        | null = null;

      if (contentType.includes("application/json")) {
        result = (await response.json()) as
          | { id: string; extractionId: string; status?: string }
          | { error: string };
      } else {
        const text = await response.text();
        result = text ? { error: text } : null;
      }

      if (!response.ok || (result && "error" in result)) {
        const rawMessage =
          result && "error" in result ? result.error : "Upload failed. Try again.";
        const safeMessage =
          rawMessage.includes("<html") || rawMessage.includes("<!DOCTYPE")
            ? "Upload failed. Check the server logs for details."
            : rawMessage;
        setAudioStatus("error");
        setAudioMessage(safeMessage);
        return;
      }

      if (!result || !("id" in result) || !result.id || !("extractionId" in result)) {
        setAudioStatus("error");
        setAudioMessage("Upload failed. Try again.");
        return;
      }

      setAudioStatus("success");
      setAudioMessage("Audio uploaded. Draft extraction is ready for review.");
      setAudioResult({
        transcriptId: result.id,
        extractionId: result.extractionId,
      });

      // Fetch and match the extraction
      fetchAndMatchExtraction(result.extractionId, token);
      fetchTranscript(result.id, token);
    } catch (error) {
      setAudioStatus("error");
      setAudioMessage(
        error instanceof Error ? error.message : "Upload failed. Try again.",
      );
    }
  }

  async function fetchTranscript(transcriptId: string, token: string) {
    setTranscriptStatus("loading");
    setTranscriptMessage("");
    try {
      const response = await fetch(`/api/transcripts/${transcriptId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setTranscriptStatus("error");
        setTranscriptMessage("Unable to load transcript text.");
        return;
      }

      const data = (await response.json()) as { rawText?: string };
      setTranscriptText(data.rawText ?? "");
      setTranscriptStatus("idle");
    } catch (error) {
      setTranscriptStatus("error");
      setTranscriptMessage(
        error instanceof Error ? error.message : "Unable to load transcript text.",
      );
    }
  }

  async function handleTranscriptTextExtraction() {
    const text = debugTranscriptInput.trim();
    if (!text) {
      setDebugStatus("error");
      setDebugMessage("Paste a transcript to test extraction.");
      return;
    }

    if (!user) {
      setDebugStatus("error");
      setDebugMessage("You need to be signed in to run extraction.");
      return;
    }

    setDebugStatus("running");
    setDebugMessage("");
    setRawExtraction(null);
    setMatchedExtraction(null);
    setTranscriptText("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setDebugStatus("error");
      setDebugMessage("Could not read your auth session. Try again.");
      return;
    }

    try {
      const response = await fetch("/api/transcripts/text", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      let result:
        | { id: string; extractionId: string; status?: string }
        | { error: string }
        | null = null;

      if (contentType.includes("application/json")) {
        result = (await response.json()) as
          | { id: string; extractionId: string; status?: string }
          | { error: string };
      } else {
        const responseText = await response.text();
        result = responseText ? { error: responseText } : null;
      }

      if (!response.ok || (result && "error" in result)) {
        const rawMessage =
          result && "error" in result ? result.error : "Extraction failed.";
        setDebugStatus("error");
        setDebugMessage(rawMessage);
        return;
      }

      if (!result || !("id" in result) || !("extractionId" in result)) {
        setDebugStatus("error");
        setDebugMessage("Extraction failed.");
        return;
      }

      setDebugStatus("success");
      setDebugMessage("Draft extraction created.");
      setAudioResult({
        transcriptId: result.id,
        extractionId: result.extractionId,
      });
      fetchAndMatchExtraction(result.extractionId, token);
      fetchTranscript(result.id, token);
    } catch (error) {
      setDebugStatus("error");
      setDebugMessage(
        error instanceof Error ? error.message : "Extraction failed.",
      );
    }
  }

  async function fetchAndMatchExtraction(extractionId: string, token: string) {
    setExtractionLoading(true);
    try {
      const response = await fetch(`/api/extractions/${extractionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        extractedPayload: ExtractionPayload;
      };

      if (data.extractedPayload) {
        // Store raw extraction for debug modal
        setRawExtraction(data.extractedPayload);

        const matched = matchExtraction(data.extractedPayload, index);
        setMatchedExtraction(matched);

        // Auto-apply the extraction to populate the form
        applyExtractionData(matched);
      }
    } catch {
      // Silently fail - extraction review is optional
    } finally {
      setExtractionLoading(false);
    }
  }

  function applyExtractionData(extraction: MatchedExtraction) {
    const { session, sparringRounds } = extraction;

    // Apply session details
    if (session.date) {
      // Try to parse date - it may come in various formats
      const parsed = new Date(session.date);
      if (!isNaN(parsed.getTime())) {
        setDate(parsed.toISOString().slice(0, 10));
      }
    }
    if (session.giOrNogi) {
      setGiOrNogi(session.giOrNogi);
    }
    if (session.sessionType) {
      const matchedType = sessionTypes.find(
        (t) => t.toLowerCase().replace(/-/g, " ") === session.sessionType.toLowerCase(),
      );
      if (matchedType) {
        setSessionType(matchedType);
      }
    }

    // Apply techniques
    if (session.techniques.length > 0 || session.positionNotes.length > 0) {
      const newDrafts: DraftTechnique[] = [];

      for (const tech of session.techniques) {
        newDrafts.push({
          id: createId(),
          positionId: tech.positionMatch?.item.id ?? null,
          techniqueId: tech.techniqueMatch?.item.id ?? null,
          keyDetails: tech.keyDetails,
          notes: tech.notes,
          expanded: tech.keyDetails.length > 0 || Boolean(tech.notes),
          notesExpanded: Boolean(tech.notes),
        });
      }

      for (const note of session.positionNotes) {
        newDrafts.push({
          id: createId(),
          positionId: note.positionMatch?.item.id ?? null,
          techniqueId: null,
          keyDetails: note.keyDetails,
          notes: note.notes,
          expanded: note.keyDetails.length > 0 || Boolean(note.notes),
          notesExpanded: Boolean(note.notes),
        });
      }

      if (newDrafts.length > 0) {
        setTechniqueDrafts(newDrafts);
      }
    }

    // Apply sparring rounds
    if (sparringRounds.length > 0) {
      const newRounds: DraftRound[] = sparringRounds.map((round) => {
        const submissionsFor: RoundSubmission[] = round.submissionsFor
          .filter((s) => s.techniqueMatch)
          .map((s) => ({
            id: createId(),
            techniqueId: s.techniqueMatch!.item.id,
            positionId: null,
          }));

        const submissionsAgainst: RoundSubmission[] = round.submissionsAgainst
          .filter((s) => s.techniqueMatch)
          .map((s) => ({
            id: createId(),
            techniqueId: s.techniqueMatch!.item.id,
            positionId: null,
          }));

        // Try to parse belt
        let partnerBelt: BeltLevel | null = null;
        const beltStr = round.partnerBelt.toLowerCase();
        if (beltStr.includes("white")) partnerBelt = "white";
        else if (beltStr.includes("blue")) partnerBelt = "blue";
        else if (beltStr.includes("purple")) partnerBelt = "purple";
        else if (beltStr.includes("brown")) partnerBelt = "brown";
        else if (beltStr.includes("black")) partnerBelt = "black";

        return {
          id: createId(),
          partnerName: round.partnerName,
          partnerBelt,
          submissionsFor,
          submissionsAgainst,
          submissionsForCount: Math.max(submissionsFor.length, round.submissionsFor.length),
          submissionsAgainstCount: Math.max(submissionsAgainst.length, round.submissionsAgainst.length),
          dominantPositions: [],
          stuckPositions: [],
          notes: round.notes,
          notesExpanded: Boolean(round.notes),
        };
      });

      setRoundDrafts(newRounds);
    }
  }

  function applyExtraction() {
    if (!matchedExtraction) {
      return;
    }
    applyExtractionData(matchedExtraction);
    setMatchedExtraction(null);
  }

  function dismissExtraction() {
    setMatchedExtraction(null);
    setRawExtraction(null);
  }

  function handleCreateUnmatched(item: UnmatchedItem) {
    setCreateUnmatchedItem(item);
  }

  function handleUnmatchedCreated() {
    // After creating an item, re-match the extraction to update the UI
    if (matchedExtraction && audioResult) {
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (token) {
          fetchAndMatchExtraction(audioResult.extractionId, token);
        }
      });
    }
    setCreateUnmatchedItem(null);
  }

  function openCustomSubmission(roundId: string, side: "for" | "against") {
    setCustomSubmissionTarget({ roundId, side });
    setCustomSubmissionName("");
    setCustomSubmissionPositionId("");
    setSubmissionPicker(null);
    setSubmissionSearch("");
  }

  function handleCustomSubmissionSave() {
    if (!customSubmissionTarget) {
      return;
    }

    const trimmedName = customSubmissionName.trim();
    if (!trimmedName || !customSubmissionPositionId) {
      return;
    }

    const created = addCustomTechnique({
      name: trimmedName,
      category: "submission",
      positionFromId: customSubmissionPositionId,
      positionToId: null,
    });

    if (!created) {
      return;
    }

    handleSubmissionSelect(
      customSubmissionTarget.roundId,
      customSubmissionTarget.side,
      created.id,
    );
    setCustomSubmissionTarget(null);
  }

  const activePositionRound = positionPickerTarget
    ? roundDrafts.find((round) => round.id === positionPickerTarget.roundId) ?? null
    : null;
  const activePositionOptions =
    positionPickerTarget?.type === "dominant"
      ? sparringDominantPositions
      : sparringStuckPositions;
  const activePositions =
    positionPickerTarget && activePositionRound
      ? positionPickerTarget.type === "dominant"
        ? activePositionRound.dominantPositions
        : activePositionRound.stuckPositions
      : [];
  const positionQuery = positionSearch.trim().toLowerCase();
  const filteredPositionOptions = positionQuery
    ? activePositionOptions.filter((option) =>
        option.label.toLowerCase().includes(positionQuery),
      )
    : activePositionOptions;

  const ambiguousOptions = ambiguousSubmission
    ? ambiguousSubmissions[ambiguousSubmission.techniqueId] ?? []
    : [];
  const ambiguousTechnique = ambiguousSubmission
    ? index.techniquesById.get(ambiguousSubmission.techniqueId) ?? null
    : null;

  function resetForm() {
    setDate(new Date().toISOString().slice(0, 10));
    setSessionType(sessionTypes[0]);
    setGiOrNogi("gi");
    setDurationMinutes("");
    setNotes("");
    setInsights("");
    setGoalsForNext("");
    setTechniqueDrafts([createDraftTechnique()]);
    setRoundDrafts([]);
    setBeltPickerRoundId(null);
    setSubmissionPicker(null);
    setSubmissionSearch("");
    setAmbiguousSubmission(null);
    setPositionPickerTarget(null);
    setPositionSearch("");
    setCustomSubmissionTarget(null);
    setCustomSubmissionName("");
    setCustomSubmissionPositionId("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!user) {
      setFormError("You must be signed in to save a session.");
      return;
    }

    const filledDrafts = techniqueDrafts.filter(
      (draft) =>
        draft.positionId ||
        draft.techniqueId ||
        draft.notes.trim() ||
        draft.keyDetails.length > 0,
    );
    const invalidDrafts = filledDrafts.filter(
      (draft) => Boolean(draft.techniqueId) && !draft.positionId,
    );

    if (invalidDrafts.length > 0) {
      setFormError("Select a position before choosing a technique.");
      return;
    }

    const now = new Date().toISOString();
    const sessionId = createId();

    const techniquesDrilled: SessionTechnique[] = filledDrafts
      .filter((draft) => draft.positionId && draft.techniqueId)
      .map((draft) => ({
        id: createId(),
        sessionId,
        positionId: draft.positionId as string,
        techniqueId: draft.techniqueId as string,
        keyDetails: draft.keyDetails,
        notes: draft.notes.trim(),
      }));

    const positionNotes: SessionPositionNote[] = filledDrafts
      .filter(
        (draft) =>
          draft.positionId &&
          !draft.techniqueId &&
          (draft.notes.trim() || draft.keyDetails.length > 0),
      )
      .map((draft) => ({
        id: createId(),
        sessionId,
        positionId: draft.positionId as string,
        keyDetails: draft.keyDetails,
        notes: draft.notes.trim(),
      }));

    const sparringRounds: SparringRound[] = roundDrafts.map((round) => ({
      id: round.id,
      partnerName: round.partnerName.trim() || null,
      partnerBelt: round.partnerBelt,
      submissionsFor: round.submissionsFor,
      submissionsAgainst: round.submissionsAgainst,
      submissionsForCount: round.submissionsForCount,
      submissionsAgainstCount: round.submissionsAgainstCount,
      dominantPositions: round.dominantPositions,
      stuckPositions: round.stuckPositions,
      notes: round.notes.trim(),
    }));

    const session: Session = {
      id: sessionId,
      userId: user.id,
      date,
      sessionType,
      giOrNogi,
      durationMinutes: durationMinutes === "" ? null : durationMinutes,
      energyLevel: null,
      techniques: techniquesDrilled,
      positionNotes,
      sparringRounds,
      notes: notes.trim(),
      insights: insights
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      goalsForNext: goalsForNext
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      createdAt: now,
      updatedAt: now,
    };

    addSession(session);
    recordTechniqueProgress(
      techniquesDrilled.map((item) => item.techniqueId),
      now,
    );
    recordTagUsage(
      [...techniquesDrilled, ...positionNotes].flatMap((item) => item.keyDetails),
      now,
    );
    recordPartnerNames(
      sparringRounds
        .map((round) => round.partnerName)
        .filter((name): name is string => Boolean(name)),
      now,
    );

    setSaved(true);
    resetForm();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Session Log
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Log a session</h1>
          <p className="text-sm text-zinc-600">
            Capture the essentials fast, then review in session history.
          </p>
        </div>
        <Link
          href="/sessions"
          className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          View sessions
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Voice transcript (optional)</h2>
            {audioStatus === "uploading" ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                Uploading...
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-600">
            Upload a recording to generate a transcript and draft session summary.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="audio/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setAudioFile(file);
                setAudioStatus("idle");
                setAudioMessage("");
                setAudioResult(null);
                setTranscriptText("");
                setTranscriptStatus("idle");
                setTranscriptMessage("");
              }}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleAudioUpload}
              disabled={!audioFile || audioStatus === "uploading"}
              className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:bg-transparent"
            >
              Upload audio
            </button>
            <button
              type="button"
              onClick={() => setShowExtractionDebug(true)}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              Upload transcript
            </button>
          </div>
          {audioMessage ? (
            <p
              className={`text-sm ${
                audioStatus === "error" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {audioMessage}
            </p>
          ) : null}
          {audioResult ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-500">
                Transcript ID: {audioResult.transcriptId} • Extraction ID:{" "}
                {audioResult.extractionId}
              </p>
              {(rawExtraction || matchedExtraction) && (
                <button
                  type="button"
                  onClick={() => setShowExtractionDebug(true)}
                  className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
                >
                  Debug
                </button>
              )}
            </div>
          ) : null}
          {extractionLoading ? (
            <p className="text-sm text-amber-600">Loading extraction...</p>
          ) : null}
          {matchedExtraction ? (
            <ExtractionReviewPanel
              extraction={matchedExtraction}
              onApply={applyExtraction}
              onDismiss={dismissExtraction}
              onCreateUnmatched={handleCreateUnmatched}
            />
          ) : null}
        </section>

        <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Session details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Session type
              <select
                value={sessionType}
                onChange={(event) =>
                  setSessionType(event.target.value as typeof sessionTypes[number])
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {sessionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Gi or NoGi
              <select
                value={giOrNogi}
                onChange={(event) =>
                  setGiOrNogi(event.target.value as "gi" | "nogi" | "both")
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="gi">Gi</option>
                <option value="nogi">NoGi</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Duration (minutes)
              <input
                type="number"
                min={0}
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Techniques drilled</h2>
            <button
              type="button"
              onClick={addTechnique}
              className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Add another technique
            </button>
          </div>
          <p className="text-sm text-zinc-600">
            Optional. Leave blank if you only want to log sparring rounds.
          </p>

          {techniqueDrafts.map((draft, indexValue) => {
            const technique = draft.techniqueId
              ? index.techniquesById.get(draft.techniqueId) ?? null
              : null;
            const suggestions = buildTagSuggestions(technique, tagSuggestions);

            return (
              <div
                key={draft.id}
                className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700">
                    Technique {indexValue + 1}
                  </h3>
                  {techniqueDrafts.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeTechnique(draft.id)}
                      className="text-xs font-semibold text-zinc-500 transition hover:text-red-500"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 text-sm font-medium text-zinc-700">
                    <span>Position</span>
                    <PositionPicker
                      value={draft.positionId}
                      onChange={(positionId) =>
                        updateTechnique(draft.id, {
                          positionId,
                          techniqueId: null,
                        })
                      }
                      recentPositionIds={recentPositionIds}
                      index={index}
                      onAddCustomPosition={addCustomPosition}
                    />
                  </div>
                  <div className="space-y-2 text-sm font-medium text-zinc-700">
                    <span>Technique (optional)</span>
                    <TechniquePicker
                      value={draft.techniqueId}
                      positionId={draft.positionId}
                      onChange={(techniqueId) =>
                        updateTechnique(draft.id, { techniqueId })
                      }
                      recentTechniqueIds={recentTechniqueIds}
                      index={index}
                      onAddCustomTechnique={addCustomTechnique}
                    />
                    <p className="text-xs font-medium text-zinc-400">
                      Leave blank to save a position note instead.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateTechnique(draft.id, { expanded: !draft.expanded })
                  }
                  className="mt-4 text-xs font-semibold text-zinc-500"
                >
                  {draft.expanded ? "Collapse details" : "Add details"}
                </button>

                {draft.expanded ? (
                  <div className="mt-4 space-y-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-zinc-700">Key details</p>
                      <TagPicker
                        value={draft.keyDetails}
                        suggestions={suggestions}
                        onChange={(tags) =>
                          updateTechnique(draft.id, { keyDetails: tags })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      {!draft.notesExpanded && draft.notes.length === 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateTechnique(draft.id, { notesExpanded: true })
                          }
                          className="text-xs font-semibold text-zinc-500"
                        >
                          Add notes
                        </button>
                      ) : (
                        <label className="space-y-2 text-sm font-medium text-zinc-700">
                          Notes
                          <textarea
                            value={draft.notes}
                            onChange={(event) =>
                              updateTechnique(draft.id, {
                                notes: event.target.value,
                                notesExpanded: true,
                              })
                            }
                            className="min-h-[90px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Sparring rounds</h2>
            <button
              type="button"
              onClick={addRound}
              className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Add round
            </button>
          </div>

          {roundDrafts.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Optional. Add rounds to capture sparring notes and outcomes.
            </p>
          ) : (
            <div className="space-y-4">
              {roundDrafts.map((round, roundIndex) => {
                const belt = beltOptions.find(
                  (option) => option.value === round.partnerBelt,
                );
                const partnerQuery = round.partnerName.trim().toLowerCase();
                const partnerMatches = partnerQuery
                  ? partnerSuggestions
                      .filter(
                        (name) =>
                          name.toLowerCase().includes(partnerQuery) &&
                          name.toLowerCase() !== partnerQuery,
                      )
                      .slice(0, 5)
                  : [];

                return (
                  <div
                    key={round.id}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-700">
                        Round {roundIndex + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeRound(round.id)}
                        className="text-xs font-semibold text-zinc-500 transition hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 text-sm font-medium text-zinc-700">
                        <span>Partner</span>
                        <div className="relative">
                          <input
                            value={round.partnerName}
                            onChange={(event) =>
                              updateRound(round.id, { partnerName: event.target.value })
                            }
                            placeholder="Name or initials"
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          />
                          {partnerMatches.length > 0 ? (
                            <div className="absolute z-10 mt-2 w-full rounded-lg border border-zinc-200 bg-white shadow-sm">
                              {partnerMatches.map((name) => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() =>
                                    updateRound(round.id, { partnerName: name })
                                  }
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm font-medium text-zinc-700">
                        <span>Belt</span>
                        <button
                          type="button"
                          onClick={() => setBeltPickerRoundId(round.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full border ${
                                belt?.dotClass ?? "border-zinc-300 bg-zinc-100"
                              }`}
                            />
                            <span>{belt?.label ?? "Select belt"}</span>
                          </span>
                          <span className="text-xs text-zinc-400">v</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {([
                        { label: "I submitted", side: "for" as const },
                        { label: "I got caught", side: "against" as const },
                      ] as const).map(({ label, side }) => {
                        const submissions =
                          side === "for" ? round.submissionsFor : round.submissionsAgainst;
                        const submissionCount =
                          side === "for"
                            ? round.submissionsForCount
                            : round.submissionsAgainstCount;
                        return (
                          <div
                            key={label}
                            className="rounded-xl border border-zinc-100 bg-white p-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                              {label}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => decrementSubmissionCount(round.id, side)}
                                className="h-9 w-9 rounded-full border border-zinc-200 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
                              >
                                -
                              </button>
                              <span className="text-lg font-semibold text-zinc-800">
                                {submissionCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementSubmissionCount(round.id, side)}
                                className="h-9 w-9 rounded-full border border-zinc-200 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
                              >
                                +
                              </button>
                            </div>

                            {submissions.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {submissions.map((submission) => {
                                  const technique = index.techniquesById.get(
                                    submission.techniqueId,
                                  );
                                  const position = submission.positionId
                                    ? index.positionsById.get(submission.positionId)
                                    : null;
                                  const labelText = position
                                    ? `${technique?.name ?? "Unknown submission"} (${position.name})`
                                    : technique?.name ?? "Unknown submission";

                                  return (
                                    <span
                                      key={submission.id}
                                      className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                                    >
                                      {labelText}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeSubmission(round.id, side, submission.id)
                                        }
                                        className="text-xs text-amber-600 hover:text-amber-800"
                                      >
                                        x
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => openSubmissionPicker(round.id, side)}
                              className="mt-3 text-xs font-semibold text-zinc-500"
                            >
                              Add submission detail
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateRound(round.id, {
                          notesExpanded: !round.notesExpanded,
                        })
                      }
                      className="mt-4 text-xs font-semibold text-zinc-500"
                    >
                      {round.notesExpanded ? "Collapse position notes" : "Add position notes"}
                    </button>

                    {round.notesExpanded ? (
                      <div className="mt-4 space-y-4 rounded-xl border border-zinc-100 bg-white p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 text-sm font-medium text-zinc-700">
                            <div className="flex items-center justify-between">
                              <span>Where I dominated</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPositionSearch("");
                                  setPositionPickerTarget({
                                    roundId: round.id,
                                    type: "dominant",
                                  });
                                }}
                                className="text-xs font-semibold text-amber-600"
                              >
                                Add position
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {round.dominantPositions.map((positionId) => (
                                <span
                                  key={positionId}
                                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600"
                                >
                                  {index.positionsById.get(positionId)?.name ?? positionId}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleRoundPosition(
                                        round.id,
                                        "dominant",
                                        positionId,
                                      )
                                    }
                                    className="text-xs text-zinc-500 hover:text-zinc-700"
                                  >
                                    x
                                  </button>
                                </span>
                              ))}
                              {round.dominantPositions.length === 0 ? (
                                <span className="text-xs text-zinc-400">None yet.</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm font-medium text-zinc-700">
                            <div className="flex items-center justify-between">
                              <span>Where I got stuck</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPositionSearch("");
                                  setPositionPickerTarget({
                                    roundId: round.id,
                                    type: "stuck",
                                  });
                                }}
                                className="text-xs font-semibold text-amber-600"
                              >
                                Add position
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {round.stuckPositions.map((positionId) => (
                                <span
                                  key={positionId}
                                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600"
                                >
                                  {index.positionsById.get(positionId)?.name ?? positionId}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleRoundPosition(round.id, "stuck", positionId)
                                    }
                                    className="text-xs text-zinc-500 hover:text-zinc-700"
                                  >
                                    x
                                  </button>
                                </span>
                              ))}
                              {round.stuckPositions.length === 0 ? (
                                <span className="text-xs text-zinc-400">None yet.</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <label className="space-y-2 text-sm font-medium text-zinc-700">
                          Round notes
                          <textarea
                            value={round.notes}
                            onChange={(event) =>
                              updateRound(round.id, { notes: event.target.value })
                            }
                            placeholder="What worked or failed?"
                            className="min-h-[90px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Notes</h2>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Session notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[90px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Insights (comma separated)
              <input
                value={insights}
                onChange={(event) => setInsights(event.target.value)}
                placeholder="posture, grip breaking"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Goals for next session
              <input
                value={goalsForNext}
                onChange={(event) => setGoalsForNext(event.target.value)}
                placeholder="play more open guard"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <Modal
          open={Boolean(beltPickerRoundId)}
          onClose={() => setBeltPickerRoundId(null)}
          title="Select belt level"
        >
          <div className="space-y-2">
            {beltOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (beltPickerRoundId) {
                    updateRound(beltPickerRoundId, { partnerBelt: option.value });
                  }
                  setBeltPickerRoundId(null);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
              >
                <span
                  className={`h-3 w-3 rounded-full border ${option.dotClass}`}
                />
                <span>{option.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (beltPickerRoundId) {
                  updateRound(beltPickerRoundId, { partnerBelt: null });
                }
                setBeltPickerRoundId(null);
              }}
              className="w-full rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-500"
            >
              Clear selection
            </button>
          </div>
        </Modal>

        <Modal
          open={Boolean(submissionPicker)}
          onClose={() => {
            setSubmissionPicker(null);
            setSubmissionSearch("");
          }}
          title="Select submission"
        >
          <div className="space-y-4">
            <input
              value={submissionSearch}
              onChange={(event) => setSubmissionSearch(event.target.value)}
              placeholder="Search submissions"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />

            {submissionSearch.trim() ? (
              <div className="space-y-2">
                {submissionResults.length === 0 ? (
                  <p className="text-sm text-zinc-500">No submissions found.</p>
                ) : (
                  submissionResults.map((technique) => (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() =>
                        submissionPicker &&
                        handleSubmissionSelect(
                          submissionPicker.roundId,
                          submissionPicker.side,
                          technique.id,
                        )
                      }
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                    >
                      <span>{technique.name}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {commonSubmissions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                      Common
                    </p>
                    {commonSubmissions.map((technique) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() =>
                          submissionPicker &&
                          handleSubmissionSelect(
                            submissionPicker.roundId,
                            submissionPicker.side,
                            technique.id,
                          )
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                      >
                        <span>{technique.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {recentSubmissions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                      Recent
                    </p>
                    {recentSubmissions.map((technique) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() =>
                          submissionPicker &&
                          handleSubmissionSelect(
                            submissionPicker.roundId,
                            submissionPicker.side,
                            technique.id,
                          )
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                      >
                        <span>{technique.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    All submissions
                  </p>
                  {submissionList.map((technique) => (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() =>
                        submissionPicker &&
                        handleSubmissionSelect(
                          submissionPicker.roundId,
                          submissionPicker.side,
                          technique.id,
                        )
                      }
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                    >
                      <span>{technique.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {submissionPicker ? (
              <button
                type="button"
                onClick={() =>
                  openCustomSubmission(
                    submissionPicker.roundId,
                    submissionPicker.side,
                  )
                }
                className="w-full rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600"
              >
                Add custom submission
              </button>
            ) : null}
          </div>
        </Modal>

        <Modal
          open={Boolean(customSubmissionTarget)}
          onClose={() => setCustomSubmissionTarget(null)}
          title="Add custom submission"
        >
          <div className="space-y-4">
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Name
              <input
                value={customSubmissionName}
                onChange={(event) => setCustomSubmissionName(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Armbar"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Starting position
              <select
                value={customSubmissionPositionId}
                onChange={(event) => setCustomSubmissionPositionId(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Select position</option>
                {index.positionsInTreeOrder.map((position) => (
                  <option key={position.id} value={position.id}>
                    {index.getFullPath(position.id)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomSubmissionTarget(null)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomSubmissionSave}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Add submission
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          open={Boolean(ambiguousSubmission)}
          onClose={() => setAmbiguousSubmission(null)}
          title={
            ambiguousTechnique
              ? `${ambiguousTechnique.name} position`
              : "Submission position"
          }
        >
          <div className="space-y-3">
            {ambiguousOptions.map((positionId) => (
              <button
                key={positionId}
                type="button"
                onClick={() => handleAmbiguousPositionSelect(positionId)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
              >
                <span>{index.positionsById.get(positionId)?.name ?? positionId}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleAmbiguousPositionSelect(null)}
              className="w-full rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-500"
            >
              Skip position
            </button>
          </div>
        </Modal>

        <Modal
          open={Boolean(positionPickerTarget)}
          onClose={() => {
            setPositionPickerTarget(null);
            setPositionSearch("");
          }}
          title={
            positionPickerTarget?.type === "dominant"
              ? "Where did you dominate?"
              : "Where did you get stuck?"
          }
        >
          <div className="space-y-4">
            <input
              value={positionSearch}
              onChange={(event) => setPositionSearch(event.target.value)}
              placeholder="Search positions"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              {activePositions.length} selected
            </p>
            <div className="space-y-2">
              {filteredPositionOptions.length === 0 ? (
                <p className="text-sm text-zinc-500">No positions found.</p>
              ) : (
                filteredPositionOptions.map((option) => {
                const checked = activePositions.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      positionPickerTarget &&
                      toggleRoundPosition(
                        positionPickerTarget.roundId,
                        positionPickerTarget.type,
                        option.id,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="h-4 w-4"
                    />
                    <span>{option.label}</span>
                  </button>
                );
                })
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setPositionPickerTarget(null);
                setPositionSearch("");
              }}
              className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        </Modal>

        <Modal
          open={Boolean(createUnmatchedItem)}
          onClose={() => setCreateUnmatchedItem(null)}
          title={
            createUnmatchedItem?.type === "position"
              ? "Create custom position"
              : "Create custom technique"
          }
        >
          {createUnmatchedItem?.type === "position" ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Create a custom position for &quot;{createUnmatchedItem.name}&quot;
              </p>
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                Name
                <input
                  defaultValue={createUnmatchedItem.name}
                  id="unmatched-position-name"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                Parent position (optional)
                <select
                  id="unmatched-position-parent"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">None (root position)</option>
                  {index.positionsInTreeOrder.map((position) => (
                    <option key={position.id} value={position.id}>
                      {index.getFullPath(position.id)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateUnmatchedItem(null)}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById("unmatched-position-name") as HTMLInputElement;
                    const parentSelect = document.getElementById("unmatched-position-parent") as HTMLSelectElement;
                    const name = nameInput?.value.trim();
                    const parentId = parentSelect?.value || null;
                    if (name) {
                      addCustomPosition({ name, parentId, perspective: "neutral" });
                      handleUnmatchedCreated();
                    }
                  }}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create position
                </button>
              </div>
            </div>
          ) : createUnmatchedItem?.type === "technique" ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Create a custom technique for &quot;{createUnmatchedItem.name}&quot;
                {createUnmatchedItem.context?.positionName && (
                  <> from {createUnmatchedItem.context.positionName}</>
                )}
              </p>
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                Name
                <input
                  defaultValue={createUnmatchedItem.name}
                  id="unmatched-technique-name"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-zinc-700">
                Starting position
                <select
                  id="unmatched-technique-position"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  defaultValue={createUnmatchedItem.context?.positionId ?? ""}
                >
                  <option value="">Select position</option>
                  {index.positionsInTreeOrder.map((position) => (
                    <option key={position.id} value={position.id}>
                      {index.getFullPath(position.id)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateUnmatchedItem(null)}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById("unmatched-technique-name") as HTMLInputElement;
                    const positionSelect = document.getElementById("unmatched-technique-position") as HTMLSelectElement;
                    const name = nameInput?.value.trim();
                    const positionFromId = positionSelect?.value;
                    if (name && positionFromId) {
                      addCustomTechnique({ name, category: "transition", positionFromId, positionToId: null });
                      handleUnmatchedCreated();
                    }
                  }}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create technique
                </button>
              </div>
            </div>
          ) : null}
        </Modal>

        <Modal
          open={showExtractionDebug}
          onClose={() => setShowExtractionDebug(false)}
          title="Extraction Debug"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Test from Transcript Text
              </p>
              <textarea
                value={debugTranscriptInput}
                onChange={(event) => setDebugTranscriptInput(event.target.value)}
                rows={6}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Paste a transcript to run extraction without audio."
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTranscriptTextExtraction}
                  disabled={debugStatus === "running"}
                  className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-200"
                >
                  {debugStatus === "running" ? "Running..." : "Run extraction"}
                </button>
                {debugMessage ? (
                  <span
                    className={`text-xs ${
                      debugStatus === "error" ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {debugMessage}
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Transcript Text
              </p>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs">
                {transcriptText ||
                  (transcriptStatus === "loading"
                    ? "Loading transcript..."
                    : "No transcript loaded")}
              </pre>
              {transcriptMessage ? (
                <p className="mt-2 text-xs text-red-600">{transcriptMessage}</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Raw Extraction Payload
              </p>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs">
                {rawExtraction ? JSON.stringify(rawExtraction, null, 2) : "No extraction data"}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Matched Extraction
              </p>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs">
                {matchedExtraction ? JSON.stringify(matchedExtraction, null, 2) : "No matched data"}
              </pre>
            </div>
            <button
              type="button"
              onClick={() => setShowExtractionDebug(false)}
              className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </Modal>

        {formError ? (
          <p className="text-sm font-semibold text-red-500">{formError}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Save session
          </button>
          {saved ? (
            <span className="text-sm font-semibold text-amber-600">
              Session saved.
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
