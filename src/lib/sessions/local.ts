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
      return parsed as Session[];
    }
  } catch {
    return [];
  }

  return [];
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
