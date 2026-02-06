"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";

import { PositionPicker } from "@/components/positions/position-picker";
import { TechniquePicker } from "@/components/techniques/technique-picker";
import { TagPicker } from "@/components/techniques/tag-picker";
import {
  ExtractionReviewPanel,
  type UnmatchedItem,
} from "@/components/extraction/extraction-review-panel";
import {
  TaxonomyCard,
  ClickableTaxonomy,
} from "@/components/taxonomy/taxonomy-card";
import { Button, Card, FormField, Modal, Tag } from "@/components/ui";
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

  // Section visibility
  const [showTechniques, setShowTechniques] = useState(true);
  const [showSparring, setShowSparring] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [compactRounds, setCompactRounds] = useState(true);
  const [expandedRoundIds, setExpandedRoundIds] = useState<Set<string>>(
    new Set(),
  );

  // Post-save summary
  const [savedSummary, setSavedSummary] = useState<{
    date: string;
    techniques: number;
    rounds: number;
    subsFor: number;
    subsAgainst: number;
    sessionId: string;
  } | null>(null);

  // Taxonomy card state
  const [taxonomyCard, setTaxonomyCard] = useState<{
    type: "position" | "technique";
    id: string;
  } | null>(null);

  // Session metadata
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

  // Technique drafts
  const [techniqueDrafts, setTechniqueDrafts] = useState<DraftTechnique[]>([
    createDraftTechnique(),
  ]);

  // Sparring rounds
  const [roundDrafts, setRoundDrafts] = useState<DraftRound[]>([createDraftRound()]);
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

  // Audio recording state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioStatus, setAudioStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [audioMessage, setAudioMessage] = useState("");
  const [audioResult, setAudioResult] = useState<{
    transcriptId: string;
    extractionId: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0]);

  // Transcript/extraction state
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

  // Form state
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  // Computed values
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

  // Handlers
  const openTaxonomyCard = useCallback(
    (type: "position" | "technique", id: string) => {
      setTaxonomyCard({ type, id });
    },
    [],
  );

  const updateTechnique = useCallback(
    (id: string, update: Partial<DraftTechnique>) => {
      setTechniqueDrafts((prev) =>
        prev.map((technique) =>
          technique.id === id ? { ...technique, ...update } : technique,
        ),
      );
    },
    [],
  );

  const addTechnique = useCallback(() => {
    setTechniqueDrafts((prev) => [...prev, createDraftTechnique()]);
  }, []);

  const removeTechnique = useCallback((id: string) => {
    setTechniqueDrafts((prev) => prev.filter((technique) => technique.id !== id));
  }, []);

  const updateRound = useCallback(
    (id: string, update: Partial<DraftRound>) => {
      setRoundDrafts((prev) =>
        prev.map((round) => (round.id === id ? { ...round, ...update } : round)),
      );
    },
    [],
  );

  const addRound = useCallback(() => {
    setRoundDrafts((prev) => [...prev, createDraftRound()]);
  }, []);

  const removeRound = useCallback(
    (id: string) => {
      setRoundDrafts((prev) => {
        const round = prev.find((item) => item.id === id);
        if (!round) {
          return prev;
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
          return prev;
        }

        return prev.filter((item) => item.id !== id);
      });
    },
    [],
  );

  const toggleRoundPosition = useCallback(
    (roundId: string, type: "dominant" | "stuck", positionId: string) => {
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
    },
    [],
  );

  const openSubmissionPicker = useCallback(
    (roundId: string, side: "for" | "against") => {
      setSubmissionPicker({ roundId, side });
      setSubmissionSearch("");
    },
    [],
  );

  const incrementSubmissionCount = useCallback(
    (roundId: string, side: "for" | "against") => {
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
    },
    [],
  );

  const decrementSubmissionCount = useCallback(
    (roundId: string, side: "for" | "against") => {
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
    },
    [],
  );

  const removeSubmission = useCallback(
    (roundId: string, side: "for" | "against", id: string) => {
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
    },
    [],
  );

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

      fetchAndMatchExtraction(result.extractionId, token);
      fetchTranscript(result.id, token);
    } catch (error) {
      setAudioStatus("error");
      setAudioMessage(
        error instanceof Error ? error.message : "Upload failed. Try again.",
      );
    }
  }

  async function startRecording() {
    if (isRecording) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.fftSize);
      function updateLevels() {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);
        const segmentSize = Math.floor(dataArray.length / 5);
        const levels = [0, 1, 2, 3, 4].map((i) => {
          let sum = 0;
          for (let j = 0; j < segmentSize; j++) {
            const val = dataArray[i * segmentSize + j] - 128;
            sum += Math.abs(val);
          }
          return Math.min(1, (sum / segmentSize / 128) * 4);
        });
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      }
      updateLevels();

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType });
        recordingChunksRef.current = [];
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });

        if (recordingUrl) {
          URL.revokeObjectURL(recordingUrl);
        }

        setRecordingUrl(URL.createObjectURL(blob));
        setAudioFile(file);
        setAudioStatus("idle");
        setAudioMessage("");
        setAudioResult(null);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      });

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setAudioStatus("error");
      setAudioMessage(
        error instanceof Error ? error.message : "Microphone access failed.",
      );
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) {
      return;
    }
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels([0, 0, 0, 0, 0]);
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
        setRawExtraction(data.extractedPayload);

        const matched = matchExtraction(data.extractedPayload, index);
        setMatchedExtraction(matched);

        applyExtractionData(matched);
      }
    } catch {
      // Silently fail
    } finally {
      setExtractionLoading(false);
    }
  }

  function applyExtractionData(extraction: MatchedExtraction) {
    const { session, sparringRounds } = extraction;

    if (session.date) {
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
        // Ensure techniques section is visible when extraction fills it
        setShowTechniques(true);
      }
    }

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
      // Ensure sparring section is visible when extraction fills it
      setShowSparring(true);
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
    setRoundDrafts([createDraftRound()]);
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

    const now = new Date().toISOString();
    const sessionId = createId();

    // Techniques can now be logged with or without a position
    const techniquesDrilled: SessionTechnique[] = filledDrafts
      .filter((draft) => draft.techniqueId)
      .map((draft) => ({
        id: createId(),
        sessionId,
        positionId: draft.positionId,
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

    const sparringRounds: SparringRound[] = roundDrafts
      .filter(
        (round) =>
          round.partnerName.trim() ||
          round.submissionsForCount > 0 ||
          round.submissionsAgainstCount > 0 ||
          round.dominantPositions.length > 0 ||
          round.stuckPositions.length > 0 ||
          round.notes.trim(),
      )
      .map((round) => ({
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

    setSavedSummary({
      date,
      techniques: techniquesDrilled.length,
      rounds: sparringRounds.length,
      subsFor: sparringRounds.reduce((sum, r) => sum + r.submissionsForCount, 0),
      subsAgainst: sparringRounds.reduce((sum, r) => sum + r.submissionsAgainstCount, 0),
      sessionId,
    });
    setSaved(true);
    resetForm();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="gg-stagger space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--gg-border)] pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-[var(--gg-text-muted)]">
            Session Log
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--gg-text)]">
            Log a session
          </h1>
        </div>
        <Link
          href="/sessions"
          className="rounded-full border border-[var(--gg-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text-muted)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)]"
        >
          View sessions
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            {/* Voice Input Section - Always Prominent */}
            <Card as="section" className="space-y-4 gg-card-signal">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--gg-text-muted)]">
                    Quick capture
                  </p>
                  <p className="mt-2 text-sm text-[var(--gg-text)]">
                    Record a voice note or paste text to auto-fill your session.
                  </p>
                </div>
                {audioStatus === "uploading" ? (
                  <Tag variant="status">Uploading...</Tag>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full border ${
                    isRecording
                      ? "border-[rgba(255,91,91,0.6)] bg-[rgba(255,91,91,0.25)] shadow-[0_0_18px_rgba(255,91,91,0.4)]"
                      : "border-[rgba(46,242,196,0.5)] bg-[rgba(46,242,196,0.12)] shadow-[0_0_18px_rgba(46,242,196,0.35)]"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Record voice note"}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${
                      isRecording ? "bg-[var(--gg-danger)]" : "bg-[var(--gg-signal)]"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                    {isRecording ? "Recording" : "Voice capture"}
                  </p>
                  <p className="text-sm font-semibold text-[var(--gg-text)]">
                    {isRecording ? "Tap to stop" : "Tap to record"}
                  </p>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-1 px-2">
                    {audioLevels.map((level, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-[var(--gg-danger)] transition-all duration-75"
                        style={{ height: `${8 + level * 16}px` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExtractionDebug(true)}
                >
                  Paste transcript
                </Button>
              </div>

              {recordingUrl ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-3">
                  <audio controls src={recordingUrl} className="h-8" />
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleAudioUpload}
                    disabled={!audioFile || audioStatus === "uploading"}
                  >
                    Upload & process
                  </Button>
                </div>
              ) : null}

              {audioMessage ? (
                <p
                  className={`text-sm ${
                    audioStatus === "error"
                      ? "text-[var(--gg-danger)]"
                      : "text-[var(--gg-signal)]"
                  }`}
                >
                  {audioMessage}
                </p>
              ) : null}

              {extractionLoading ? (
                <p className="text-sm text-[var(--gg-warning)]">
                  Processing transcript...
                </p>
              ) : null}

              {matchedExtraction ? (
                <ExtractionReviewPanel
                  extraction={matchedExtraction}
                  onApply={applyExtraction}
                  onDismiss={dismissExtraction}
                  onCreateUnmatched={handleCreateUnmatched}
                />
              ) : null}
            </Card>

        {/* Post-save summary */}
        {savedSummary && (
          <div className="rounded-2xl border border-[rgba(46,242,196,0.35)] bg-[rgba(18,23,28,0.92)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                  Session saved —{" "}
                  {new Date(savedSummary.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-2 text-sm text-[var(--gg-text)]">
                  {savedSummary.techniques} technique
                  {savedSummary.techniques !== 1 ? "s" : ""}
                  {savedSummary.rounds > 0 &&
                    ` · ${savedSummary.rounds} round${savedSummary.rounds !== 1 ? "s" : ""} · +${savedSummary.subsFor}/-${savedSummary.subsAgainst} subs`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSavedSummary(null)}
                className="text-xs text-[var(--gg-text-muted)] hover:text-[var(--gg-signal)]"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/sessions/${savedSummary.sessionId}`}
                className="rounded-full border border-[var(--gg-border)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)]"
              >
                View session
              </Link>
              <button
                type="button"
                onClick={() => setSavedSummary(null)}
                className="rounded-full border border-[var(--gg-border)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)]"
              >
                Log another
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
            Command
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Button variant="primary" size="lg" type="submit">
              Save session
            </Button>
            {saved ? (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-signal)]">
                Session saved.
              </span>
            ) : null}
            {formError ? (
              <span className="text-xs font-semibold text-[var(--gg-danger)]">
                {formError}
              </span>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        {/* Collapsible Metadata Section */}
        <div className="rounded-2xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)]">
          <button
            type="button"
            onClick={() => setShowMetadata(!showMetadata)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
              Session details: {new Date(date).toLocaleDateString()} &bull;{" "}
              {sessionType.replace(/-/g, " ")} &bull; {giOrNogi.toUpperCase()}
              {durationMinutes ? ` • ${durationMinutes}min` : ""}
            </span>
            <span className="text-xs text-[var(--gg-text-muted)]">
              {showMetadata ? "Hide" : "Edit"}
            </span>
          </button>
          {showMetadata && (
            <div className="border-t border-[var(--gg-border)] px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <FormField
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
                <FormField
                  as="select"
                  label="Session type"
                  value={sessionType}
                  onChange={(event) =>
                    setSessionType(event.target.value as typeof sessionTypes[number])
                  }
                >
                  {sessionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/-/g, " ")}
                    </option>
                  ))}
                </FormField>
                <FormField
                  as="select"
                  label="Gi or NoGi"
                  value={giOrNogi}
                  onChange={(event) =>
                    setGiOrNogi(event.target.value as "gi" | "nogi" | "both")
                  }
                >
                  <option value="gi">Gi</option>
                  <option value="nogi">NoGi</option>
                  <option value="both">Both</option>
                </FormField>
                <FormField
                  label="Duration (min)"
                  type="number"
                  min={0}
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(
                      event.target.value === "" ? "" : Number(event.target.value),
                    )
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
        </div>

        {/* Techniques Section (always visible, collapsible) */}
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setShowTechniques(!showTechniques)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="font-display text-xl font-semibold text-[var(--gg-text)]">
              Technique map
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text-muted)]">
              {showTechniques ? "Collapse" : "Expand"}
              {!showTechniques && techniqueDrafts.some((d) => d.positionId || d.techniqueId)
                ? ` (${techniqueDrafts.filter((d) => d.positionId || d.techniqueId).length} items)`
                : ""}
            </span>
          </button>
          {showTechniques && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={addTechnique}>
                  Add technique
                </Button>
              </div>

              {techniqueDrafts.map((draft, indexValue) => {
                const technique = draft.techniqueId
                  ? index.techniquesById.get(draft.techniqueId) ?? null
                  : null;
                const position = draft.positionId
                  ? index.positionsById.get(draft.positionId) ?? null
                  : null;
                const suggestions = buildTagSuggestions(technique, tagSuggestions);

                return (
                  <Card key={draft.id} variant="nested" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                        Technique {indexValue + 1}
                      </h3>
                      {techniqueDrafts.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTechnique(draft.id)}
                          className="hover:text-[var(--gg-danger)]"
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_1.4fr_1fr]">
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                          Position
                        </span>
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
                        {position && (
                          <button
                            type="button"
                            onClick={() => openTaxonomyCard("position", position.id)}
                            className="text-xs text-[var(--gg-signal)] hover:underline"
                          >
                            View {position.name} details
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                          Technique
                        </span>
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
                        {technique && (
                          <button
                            type="button"
                            onClick={() => openTaxonomyCard("technique", technique.id)}
                            className="text-xs text-[var(--gg-signal)] hover:underline"
                          >
                            View {technique.name} details
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                          Notes
                        </span>
                        <textarea
                          value={draft.notes}
                          onChange={(event) =>
                            updateTechnique(draft.id, {
                              notes: event.target.value,
                              notesExpanded: true,
                            })
                          }
                          placeholder="Notes — what did you learn?"
                          rows={3}
                          className="min-h-[90px] w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)] placeholder:text-[var(--gg-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                          Tags
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {draft.keyDetails.length === 0 ? (
                            <span className="text-xs text-[var(--gg-text-muted)]">
                              No tags yet.
                            </span>
                          ) : (
                            draft.keyDetails.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-[rgba(46,242,196,0.35)] bg-[rgba(46,242,196,0.12)] px-2 py-0.5 text-xs font-semibold text-[var(--gg-signal)]"
                              >
                                {tag}
                              </span>
                            ))
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateTechnique(draft.id, { expanded: !draft.expanded })
                          }
                          className="text-xs font-semibold text-[var(--gg-text-muted)]"
                        >
                          {draft.expanded ? "Hide tags" : "Add tags"}
                        </button>
                      </div>
                    </div>

                    {draft.expanded ? (
                      <div className="rounded-xl border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                          Key details
                        </p>
                        <div className="mt-2">
                          <TagPicker
                            value={draft.keyDetails}
                            suggestions={suggestions}
                            onChange={(tags) =>
                              updateTechnique(draft.id, { keyDetails: tags })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Sparring Section (always visible, collapsible) */}
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setShowSparring(!showSparring)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="font-display text-xl font-semibold text-[var(--gg-text)]">
              Sparring flow
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text-muted)]">
              {showSparring ? "Collapse" : "Expand"}
              {!showSparring && roundDrafts.some((r) => r.partnerName.trim() || r.submissionsForCount > 0 || r.submissionsAgainstCount > 0)
                ? ` (${roundDrafts.filter((r) => r.partnerName.trim() || r.submissionsForCount > 0 || r.submissionsAgainstCount > 0).length} rounds)`
                : ""}
            </span>
          </button>
          {showSparring && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {roundDrafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompactRounds(!compactRounds)}
                    className="text-xs font-semibold text-[var(--gg-text-muted)]"
                  >
                    {compactRounds ? "Expand all" : "Compact view"}
                  </button>
                )}
                <Button variant="secondary" size="sm" onClick={addRound}>
                  Add round
                </Button>
              </div>

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

                const isExpanded = !compactRounds || expandedRoundIds.has(round.id);

                // Compact row view
                if (!isExpanded) {
                  const dominantLabels = round.dominantPositions
                    .map((id) => index.positionsById.get(id)?.name)
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      key={round.id}
                      type="button"
                      onClick={() =>
                        setExpandedRoundIds((prev) => {
                          const next = new Set(prev);
                          next.add(round.id);
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)] px-4 py-3 text-left text-sm transition hover:border-[var(--gg-signal)]"
                    >
                      <span className="w-8 shrink-0 font-semibold text-[var(--gg-text-muted)]">
                        R{roundIndex + 1}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {belt && (
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full border ${belt.dotClass}`}
                          />
                        )}
                        <span className="truncate font-medium text-[var(--gg-text)]">
                          {round.partnerName.trim() || "Partner unknown"}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold text-[var(--gg-text)]">
                        +{round.submissionsForCount} / -{round.submissionsAgainstCount}
                      </span>
                      {dominantLabels && (
                        <span className="hidden truncate text-xs text-[var(--gg-text-muted)] sm:block">
                          {dominantLabels}
                        </span>
                      )}
                    </button>
                  );
                }

                return (
                  <Card key={round.id} variant="nested" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                        Round {roundIndex + 1}
                      </h3>
                      <div className="flex items-center gap-2">
                        {compactRounds && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRoundIds((prev) => {
                                const next = new Set(prev);
                                next.delete(round.id);
                                return next;
                              })
                            }
                            className="text-xs font-semibold text-[var(--gg-text-muted)]"
                          >
                            Compact
                          </button>
                        )}
                        {roundDrafts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRound(round.id)}
                            className="text-xs font-semibold text-[var(--gg-text-muted)] transition hover:text-[var(--gg-danger)]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                          Partner
                        </span>
                        <div className="relative">
                          <input
                            value={round.partnerName}
                            onChange={(event) =>
                              updateRound(round.id, { partnerName: event.target.value })
                            }
                            placeholder="Name or initials"
                            className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)] placeholder:text-[var(--gg-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)]"
                          />
                          {partnerMatches.length > 0 ? (
                            <div className="absolute z-10 mt-2 w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-1)] shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
                              {partnerMatches.map((name) => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() =>
                                    updateRound(round.id, { partnerName: name })
                                  }
                                  className="block w-full px-3 py-2 text-left text-sm text-[var(--gg-text)] hover:bg-[var(--gg-surface-2)]"
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                          Belt
                        </span>
                        <button
                          type="button"
                          onClick={() => setBeltPickerRoundId(round.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full border ${
                                belt?.dotClass ??
                                "border-[var(--gg-border)] bg-[var(--gg-surface-2)]"
                              }`}
                            />
                            <span>{belt?.label ?? "Select belt"}</span>
                          </span>
                          <span className="text-xs text-[var(--gg-text-muted)]">v</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
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
                            className="rounded-xl border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                              {label}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => decrementSubmissionCount(round.id, side)}
                                className="h-9 w-9 rounded-full border border-[var(--gg-border)] text-sm font-semibold text-[var(--gg-text)] transition hover:border-[var(--gg-signal)]"
                              >
                                -
                              </button>
                              <span className="font-mono text-2xl font-semibold text-[var(--gg-text)]">
                                {submissionCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementSubmissionCount(round.id, side)}
                                className="h-9 w-9 rounded-full border border-[var(--gg-border)] text-sm font-semibold text-[var(--gg-text)] transition hover:border-[var(--gg-signal)]"
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
                                  const subPosition = submission.positionId
                                    ? index.positionsById.get(submission.positionId)
                                    : null;
                                  const labelText = subPosition
                                    ? `${technique?.name ?? "Unknown"} (${subPosition.name})`
                                    : technique?.name ?? "Unknown submission";

                                  return (
                                    <span
                                      key={submission.id}
                                      className="flex items-center gap-2 rounded-full border border-[rgba(46,242,196,0.35)] bg-[rgba(46,242,196,0.12)] px-3 py-1 text-xs font-semibold text-[var(--gg-signal)]"
                                    >
                                      <ClickableTaxonomy
                                        type="technique"
                                        id={submission.techniqueId}
                                        name={technique?.name ?? "Unknown"}
                                        onClick={openTaxonomyCard}
                                        className="text-[var(--gg-signal)] no-underline hover:underline"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeSubmission(round.id, side, submission.id)
                                        }
                                        className="text-xs text-[var(--gg-signal)]/70 hover:text-[var(--gg-signal)]"
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
                              className="mt-3 text-xs font-semibold text-[var(--gg-text-muted)]"
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
                      className="text-xs font-semibold text-[var(--gg-text-muted)]"
                    >
                      {round.notesExpanded ? "Hide mat notes" : "Add mat notes"}
                    </button>

                    {round.notesExpanded ? (
                      <div className="space-y-4 rounded-xl border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-4">
                        <div className="space-y-3">
                          <div className="rounded-lg border border-[rgba(46,242,196,0.35)] bg-[rgba(46,242,196,0.08)] p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-signal)]">
                                Dominant lane
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPositionSearch("");
                                  setPositionPickerTarget({
                                    roundId: round.id,
                                    type: "dominant",
                                  });
                                }}
                                className="text-xs font-semibold text-[var(--gg-signal)]"
                              >
                                Add position
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {round.dominantPositions.map((positionId) => {
                                const pos = index.positionsById.get(positionId);
                                return (
                                  <span
                                    key={positionId}
                                    className="flex items-center gap-2 rounded-full border border-[rgba(46,242,196,0.35)] bg-[rgba(46,242,196,0.16)] px-3 py-1 text-xs font-semibold text-[var(--gg-signal)]"
                                  >
                                    {pos ? (
                                      <ClickableTaxonomy
                                        type="position"
                                        id={positionId}
                                        name={pos.name}
                                        onClick={openTaxonomyCard}
                                        className="text-[var(--gg-signal)] no-underline hover:underline"
                                      />
                                    ) : (
                                      positionId
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleRoundPosition(
                                          round.id,
                                          "dominant",
                                          positionId,
                                        )
                                      }
                                      className="text-xs text-[var(--gg-signal)]/70 hover:text-[var(--gg-signal)]"
                                    >
                                      x
                                    </button>
                                  </span>
                                );
                              })}
                              {round.dominantPositions.length === 0 ? (
                                <span className="text-xs text-[var(--gg-text-muted)]">
                                  None yet.
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-lg border border-[rgba(255,91,91,0.35)] bg-[rgba(255,91,91,0.08)] p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-danger)]">
                                Stuck lane
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPositionSearch("");
                                  setPositionPickerTarget({
                                    roundId: round.id,
                                    type: "stuck",
                                  });
                                }}
                                className="text-xs font-semibold text-[var(--gg-danger)]"
                              >
                                Add position
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {round.stuckPositions.map((positionId) => {
                                const pos = index.positionsById.get(positionId);
                                return (
                                  <span
                                    key={positionId}
                                    className="flex items-center gap-2 rounded-full border border-[rgba(255,91,91,0.35)] bg-[rgba(255,91,91,0.16)] px-3 py-1 text-xs font-semibold text-[var(--gg-danger)]"
                                  >
                                    {pos ? (
                                      <ClickableTaxonomy
                                        type="position"
                                        id={positionId}
                                        name={pos.name}
                                        onClick={openTaxonomyCard}
                                        className="text-[var(--gg-danger)] no-underline hover:underline"
                                      />
                                    ) : (
                                      positionId
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleRoundPosition(round.id, "stuck", positionId)
                                      }
                                      className="text-xs text-[var(--gg-danger)]/70 hover:text-[var(--gg-danger)]"
                                    >
                                      x
                                    </button>
                                  </span>
                                );
                              })}
                              {round.stuckPositions.length === 0 ? (
                                <span className="text-xs text-[var(--gg-text-muted)]">
                                  None yet.
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <label className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
                          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
                            Round notes
                          </span>
                          <textarea
                            value={round.notes}
                            onChange={(event) =>
                              updateRound(round.id, { notes: event.target.value })
                            }
                            placeholder="What worked or failed?"
                            className="min-h-[100px] w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-1)] px-3 py-2 text-sm text-[var(--gg-text)] placeholder:text-[var(--gg-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)]"
                          />
                        </label>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
            </div>
          )}
        </section>

        {/* Notes Section - Collapsed by default */}
        <div className="rounded-2xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)]">
          <button
            type="button"
            onClick={() => setNotes(notes ? notes : " ")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
              Session notes & reflections
              {notes.trim() || insights.trim() || goalsForNext.trim()
                ? " (has content)"
                : ""}
            </span>
            <span className="text-xs text-[var(--gg-text-muted)]">
              {notes.trim() || insights.trim() || goalsForNext.trim() ? "Edit" : "Add"}
            </span>
          </button>
          {(notes.trim() || insights.trim() || goalsForNext.trim() || notes === " ") && (
            <div className="border-t border-[var(--gg-border)] px-5 py-4 space-y-4">
              <FormField
                as="textarea"
                label="Session notes"
                value={notes === " " ? "" : notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What did you learn today?"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Insights (comma separated)"
                  value={insights}
                  onChange={(event) => setInsights(event.target.value)}
                  placeholder="posture, grip breaking"
                />
                <FormField
                  label="Goals for next session"
                  value={goalsForNext}
                  onChange={(event) => setGoalsForNext(event.target.value)}
                  placeholder="play more open guard"
                />
              </div>
            </div>
          )}
        </div>

        </div>
        </div>

        {/* Modals */}
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
                className="flex w-full items-center gap-3 rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
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
              className="w-full rounded-lg border border-dashed border-[var(--gg-border)] px-3 py-2 text-sm font-semibold text-[var(--gg-text-muted)]"
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
              className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)] placeholder:text-[var(--gg-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)]"
            />

            {submissionSearch.trim() ? (
              <div className="space-y-2">
                {submissionResults.length === 0 ? (
                  <p className="text-sm text-[var(--gg-text-muted)]">No submissions found.</p>
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
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
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
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
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
                        className="flex w-full items-center justify-between rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
                      >
                        <span>{technique.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {recentSubmissions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
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
                        className="flex w-full items-center justify-between rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
                      >
                        <span>{technique.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
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
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
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
                className="w-full rounded-lg border border-dashed border-[var(--gg-border)] px-3 py-2 text-sm font-semibold text-[var(--gg-text)]"
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
            <label className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
              Name
              <input
                value={customSubmissionName}
                onChange={(event) => setCustomSubmissionName(event.target.value)}
                className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)]"
                placeholder="Armbar"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
              Starting position
              <select
                value={customSubmissionPositionId}
                onChange={(event) => setCustomSubmissionPositionId(event.target.value)}
                className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)]"
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
                className="rounded-full border border-[var(--gg-border)] px-4 py-2 text-sm font-semibold text-[var(--gg-text-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomSubmissionSave}
                className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-4 py-2 text-sm font-semibold text-black"
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
                className="flex w-full items-center justify-between rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
              >
                <span>{index.positionsById.get(positionId)?.name ?? positionId}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleAmbiguousPositionSelect(null)}
              className="w-full rounded-lg border border-dashed border-[var(--gg-border)] px-3 py-2 text-sm font-semibold text-[var(--gg-text-muted)]"
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
              className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)] placeholder:text-[var(--gg-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)]"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]">
              {activePositions.length} selected
            </p>
            <div className="space-y-2">
              {filteredPositionOptions.length === 0 ? (
                <p className="text-sm text-[var(--gg-text-muted)]">No positions found.</p>
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
                    className="flex w-full items-center gap-3 rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-left text-sm text-[var(--gg-text)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="h-4 w-4 accent-[var(--gg-signal)]"
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
              className="w-full rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-4 py-2 text-sm font-semibold text-black"
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
              <p className="text-sm text-[var(--gg-text-muted)]">
                Create a custom position for &quot;{createUnmatchedItem.name}&quot;
              </p>
              <label className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
                Name
                <input
                  defaultValue={createUnmatchedItem.name}
                  id="unmatched-position-name"
                  className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)]"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
                Parent position (optional)
                <select
                  id="unmatched-position-parent"
                  className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)]"
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
                  className="rounded-full border border-[var(--gg-border)] px-4 py-2 text-sm font-semibold text-[var(--gg-text-muted)]"
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
                  className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-4 py-2 text-sm font-semibold text-black"
                >
                  Create position
                </button>
              </div>
            </div>
          ) : createUnmatchedItem?.type === "technique" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--gg-text-muted)]">
                Create a custom technique for &quot;{createUnmatchedItem.name}&quot;
                {createUnmatchedItem.context?.positionName && (
                  <> from {createUnmatchedItem.context.positionName}</>
                )}
              </p>
              <label className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
                Name
                <input
                  defaultValue={createUnmatchedItem.name}
                  id="unmatched-technique-name"
                  className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)]"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-[var(--gg-text)]">
                Starting position
                <select
                  id="unmatched-technique-position"
                  className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)]"
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
                  className="rounded-full border border-[var(--gg-border)] px-4 py-2 text-sm font-semibold text-[var(--gg-text-muted)]"
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
                  className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-4 py-2 text-sm font-semibold text-black"
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
          title="Paste Transcript"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[var(--gg-text-muted)] mb-2">
                Paste your session notes or transcript to auto-fill the form.
              </p>
              <textarea
                value={debugTranscriptInput}
                onChange={(event) => setDebugTranscriptInput(event.target.value)}
                rows={6}
                className="w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)] placeholder:text-[var(--gg-text-muted)]"
                placeholder="Today we worked on closed guard, arm bar from guard..."
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTranscriptTextExtraction}
                  disabled={debugStatus === "running"}
                  className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {debugStatus === "running" ? "Processing..." : "Extract session data"}
                </button>
                {debugMessage ? (
                  <span
                    className={`text-xs ${
                      debugStatus === "error"
                        ? "text-[var(--gg-danger)]"
                        : "text-[var(--gg-signal)]"
                    }`}
                  >
                    {debugMessage}
                  </span>
                ) : null}
              </div>
            </div>

            {(transcriptText || rawExtraction || matchedExtraction) && (
              <>
                {transcriptText && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gg-text-muted)]">
                      Transcript
                    </p>
                    <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-3 text-xs text-[var(--gg-text)]">
                      {transcriptText}
                    </pre>
                  </div>
                )}
                {rawExtraction && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gg-text-muted)]">
                      Extracted Data
                    </p>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-3 text-xs text-[var(--gg-text)]">
                      {JSON.stringify(rawExtraction, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setShowExtractionDebug(false)}
              className="w-full rounded-full border border-[var(--gg-border)] px-4 py-2 text-sm font-semibold text-[var(--gg-text)]"
            >
              Close
            </button>
          </div>
        </Modal>

        {/* Taxonomy Card Modal */}
        <TaxonomyCard
          type={taxonomyCard?.type ?? "position"}
          id={taxonomyCard?.id ?? null}
          open={Boolean(taxonomyCard)}
          onClose={() => setTaxonomyCard(null)}
          index={index}
          onNavigate={(type, id) => setTaxonomyCard({ type, id })}
        />

      </form>
    </div>
  );
}
