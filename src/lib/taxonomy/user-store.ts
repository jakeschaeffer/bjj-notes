import type {
  PartnerName,
  Position,
  Technique,
  UserPositionNote,
  UserTechniqueNote,
} from "@/lib/types";
import type { TechniqueProgress, UserTag } from "@/lib/types";

const STORAGE_KEY = "bjj-notes:user-taxonomy";

export type UserTaxonomyState = {
  positions: Position[];
  techniques: Technique[];
  tags: UserTag[];
  progress: TechniqueProgress[];
  partners: PartnerName[];
  techniqueNotes: UserTechniqueNote[];
  positionNotes: UserPositionNote[];
};

const emptyState: UserTaxonomyState = {
  positions: [],
  techniques: [],
  tags: [],
  progress: [],
  partners: [],
  techniqueNotes: [],
  positionNotes: [],
};

const listeners = new Set<() => void>();
let snapshot: UserTaxonomyState | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function loadState(): UserTaxonomyState {
  if (!isBrowser()) {
    return emptyState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyState;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        positions: Array.isArray(parsed.positions) ? parsed.positions : [],
        techniques: Array.isArray(parsed.techniques) ? parsed.techniques : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        progress: Array.isArray(parsed.progress) ? parsed.progress : [],
        partners: Array.isArray(parsed.partners) ? parsed.partners : [],
        techniqueNotes: Array.isArray(parsed.techniqueNotes)
          ? parsed.techniqueNotes
          : [],
        positionNotes: Array.isArray(parsed.positionNotes)
          ? parsed.positionNotes
          : [],
      } as UserTaxonomyState;
    }
  } catch {
    return emptyState;
  }

  return emptyState;
}

function ensureSnapshot() {
  if (snapshot) {
    return snapshot;
  }

  snapshot = loadState();
  return snapshot;
}

function commitState(next: UserTaxonomyState) {
  snapshot = next;

  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getSnapshot() {
  return ensureSnapshot();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function updateUserTaxonomy(
  updater: (state: UserTaxonomyState) => UserTaxonomyState,
) {
  const next = updater(ensureSnapshot());
  commitState(next);
  notify();
}
