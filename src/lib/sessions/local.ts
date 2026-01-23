import type { Session } from "@/lib/types";

const STORAGE_KEY = "bjj-notes:sessions";
const listeners = new Set<() => void>();
let snapshot: Session[] | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadSessions(): Session[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeSession);
    }
  } catch {
    return [];
  }

  return [];
}

function normalizeSession(raw: Session) {
  const legacyRounds =
    typeof (raw as unknown as { sparringRounds?: unknown }).sparringRounds ===
    "number"
      ? (raw as unknown as { sparringRounds: number }).sparringRounds
      : null;
  const legacySubsAchieved =
    typeof (raw as unknown as { subsAchieved?: unknown }).subsAchieved === "number"
      ? (raw as unknown as { subsAchieved: number }).subsAchieved
      : null;
  const legacySubsReceived =
    typeof (raw as unknown as { subsReceived?: unknown }).subsReceived === "number"
      ? (raw as unknown as { subsReceived: number }).subsReceived
      : null;
  const legacyNotes =
    typeof (raw as unknown as { sparringNotes?: unknown }).sparringNotes === "string"
      ? (raw as unknown as { sparringNotes: string }).sparringNotes
      : null;

  const sparringRoundsRaw = Array.isArray(
    (raw as unknown as { sparringRounds?: unknown }).sparringRounds,
  )
    ? (raw as unknown as { sparringRounds: Session["sparringRounds"] })
        .sparringRounds
    : [];
  const sparringRounds = sparringRoundsRaw.map((round) => {
    const submissionsFor = Array.isArray(round.submissionsFor)
      ? round.submissionsFor
      : [];
    const submissionsAgainst = Array.isArray(round.submissionsAgainst)
      ? round.submissionsAgainst
      : [];
    const submissionsForCount =
      typeof round.submissionsForCount === "number"
        ? round.submissionsForCount
        : submissionsFor.length;
    const submissionsAgainstCount =
      typeof round.submissionsAgainstCount === "number"
        ? round.submissionsAgainstCount
        : submissionsAgainst.length;

    return {
      ...round,
      submissionsFor,
      submissionsAgainst,
      submissionsForCount: Math.max(submissionsForCount, submissionsFor.length),
      submissionsAgainstCount: Math.max(
        submissionsAgainstCount,
        submissionsAgainst.length,
      ),
      dominantPositions: Array.isArray(round.dominantPositions)
        ? round.dominantPositions
        : [],
      stuckPositions: Array.isArray(round.stuckPositions)
        ? round.stuckPositions
        : [],
      notes: typeof round.notes === "string" ? round.notes : "",
    };
  });

  const positionNotesRaw = Array.isArray(
    (raw as unknown as { positionNotes?: unknown }).positionNotes,
  )
    ? (raw as unknown as { positionNotes: Session["positionNotes"] }).positionNotes
    : [];
  const positionNotes = positionNotesRaw.map((note) => ({
    ...note,
    keyDetails: Array.isArray(note.keyDetails) ? note.keyDetails : [],
    notes: typeof note.notes === "string" ? note.notes : "",
  }));

  const legacySparring =
    legacyRounds !== null ||
    legacySubsAchieved !== null ||
    legacySubsReceived !== null ||
    legacyNotes !== null
      ? {
          rounds: legacyRounds ?? 0,
          subsAchieved: legacySubsAchieved ?? 0,
          subsReceived: legacySubsReceived ?? 0,
          notes: legacyNotes ?? "",
        }
      : undefined;

  return {
    ...raw,
    positionNotes,
    sparringRounds,
    legacySparring,
  };
}

export function sortSessions(sessions: Session[]) {
  return [...sessions].sort((a, b) => {
    if (a.date === b.date) {
      return b.createdAt.localeCompare(a.createdAt);
    }

    return b.date.localeCompare(a.date);
  });
}

function ensureSnapshot() {
  if (snapshot) {
    return snapshot;
  }

  snapshot = sortSessions(loadSessions());
  return snapshot;
}

function commitSessions(sessions: Session[]) {
  snapshot = sortSessions(sessions);

  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function getSnapshot() {
  return ensureSnapshot();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function updateSessions(updater: (sessions: Session[]) => Session[]) {
  const next = updater(ensureSnapshot());
  commitSessions(next);
  notify();
}
