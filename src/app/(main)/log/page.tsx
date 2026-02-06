"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PositionPicker } from "@/components/positions/position-picker";
import { TechniquePicker } from "@/components/techniques/technique-picker";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import { createId } from "@/lib/utils";
import type {
  GiNoGi,
  Session,
  SessionPositionNote,
  SessionTechnique,
  SessionType,
  SparringRound,
} from "@/lib/types";

const sessionTypes: SessionType[] = [
  "regular-class",
  "open-mat",
  "private",
  "competition",
  "seminar",
  "drilling-only",
];

const sessionTypeLabels: Record<SessionType, string> = {
  "regular-class": "Regular class",
  "open-mat": "Open mat",
  "private": "Private",
  competition: "Competition",
  seminar: "Seminar",
  "drilling-only": "Drilling only",
};

const giOptions: Array<{ value: GiNoGi; label: string }> = [
  { value: "gi", label: "Gi" },
  { value: "nogi", label: "No-Gi" },
  { value: "both", label: "Both" },
];

type FocusMode = "position" | "technique";

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

function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          {label}
        </p>
        <p className="text-3xl font-semibold text-[var(--foreground)]">
          {value}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] text-lg font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] text-lg font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function LogSessionPage() {
  const { user } = useAuth();
  const { sessions, addSession } = useLocalSessions();
  const {
    index,
    addCustomPosition,
    addCustomTechnique,
    recordTechniqueProgress,
  } = useUserTaxonomy();

  const [focusMode, setFocusMode] = useState<FocusMode>("position");
  const [focusPositionId, setFocusPositionId] = useState<string | null>(null);
  const [focusTechniqueId, setFocusTechniqueId] = useState<string | null>(null);
  const [focusNotes, setFocusNotes] = useState("");

  const [tapsFor, setTapsFor] = useState(0);
  const [tapsAgainst, setTapsAgainst] = useState(0);

  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [sessionType, setSessionType] =
    useState<SessionType>("regular-class");
  const [giOrNogi, setGiOrNogi] = useState<GiNoGi>("gi");

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

  const focusLabel = useMemo(() => {
    if (focusMode === "position" && focusPositionId) {
      return index.getFullPath(focusPositionId);
    }
    if (focusMode === "technique" && focusTechniqueId) {
      return index.techniquesById.get(focusTechniqueId)?.name ?? "Technique";
    }
    return null;
  }, [focusMode, focusPositionId, focusTechniqueId, index]);

  const displayDateLabel = useMemo(() => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return "Select a date";
    }
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [date]);

  function handleFocusMode(next: FocusMode) {
    setFocusMode(next);
    setFormError("");
    setFocusNotes("");
    if (next === "position") {
      setFocusTechniqueId(null);
    } else {
      setFocusPositionId(null);
    }
  }

  function resetAfterSave() {
    setFocusNotes("");
    setTapsFor(0);
    setTapsAgainst(0);
    if (focusMode === "position") {
      setFocusPositionId(null);
    } else {
      setFocusTechniqueId(null);
    }
  }

  function handleSave() {
    setFormError("");
    if (!user) {
      setFormError("Sign in to save your session.");
      return;
    }

    if (focusMode === "position" && !focusPositionId) {
      setFormError("Choose a focus position.");
      return;
    }

    if (focusMode === "technique" && !focusTechniqueId) {
      setFormError("Choose a focus technique.");
      return;
    }

    const sessionId = createId();
    const now = new Date().toISOString();

    const techniques: SessionTechnique[] = [];
    const positionNotes: SessionPositionNote[] = [];

    if (focusMode === "technique" && focusTechniqueId) {
      const technique = index.techniquesById.get(focusTechniqueId) ?? null;
      techniques.push({
        id: createId(),
        sessionId,
        positionId: technique?.positionFromId ?? null,
        techniqueId: focusTechniqueId,
        keyDetails: [],
        notes: focusNotes.trim(),
      });
    }

    if (focusMode === "position" && focusPositionId) {
      positionNotes.push({
        id: createId(),
        sessionId,
        positionId: focusPositionId,
        keyDetails: [],
        notes: focusNotes.trim(),
      });
    }

    const sparringRounds: SparringRound[] = [
      {
        id: createId(),
        partnerName: "Class",
        partnerBelt: "unknown",
        submissionsFor: [],
        submissionsAgainst: [],
        submissionsForCount: tapsFor,
        submissionsAgainstCount: tapsAgainst,
        dominantPositions: [],
        stuckPositions: [],
        notes: "",
      },
    ];

    const session: Session = {
      id: sessionId,
      userId: user.id,
      date,
      sessionType,
      giOrNogi,
      durationMinutes: null,
      energyLevel: null,
      techniques,
      positionNotes,
      sparringRounds,
      notes: "",
      insights: [],
      goalsForNext: [],
      createdAt: now,
      updatedAt: now,
    };

    addSession(session);

    if (focusMode === "technique" && focusTechniqueId) {
      recordTechniqueProgress([focusTechniqueId], now);
    }

    setSaved(true);
    resetAfterSave();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
            Log a class
          </p>
          <h1 className="text-display text-4xl sm:text-5xl">
            Focus and taps.
          </h1>
          <p className="text-sm text-[var(--muted)]">
            One focused position or technique. Two numbers. Nothing else.
          </p>
        </div>
        <Link
          href="/sessions"
          className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
        >
          View archive
        </Link>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_28px_70px_-48px_var(--shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Focus
              </p>
              <p className="text-lg font-semibold">
                {focusLabel ?? "Pick one and keep it simple."}
              </p>
            </div>
            <div className="flex rounded-full border border-[var(--line)] bg-[var(--surface-2)] p-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              <button
                type="button"
                onClick={() => handleFocusMode("position")}
                className={`rounded-full px-3 py-2 transition ${
                  focusMode === "position"
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "hover:text-[var(--foreground)]"
                }`}
              >
                Position
              </button>
              <button
                type="button"
                onClick={() => handleFocusMode("technique")}
                className={`rounded-full px-3 py-2 transition ${
                  focusMode === "technique"
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "hover:text-[var(--foreground)]"
                }`}
              >
                Technique
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {focusMode === "position" ? (
              <PositionPicker
                value={focusPositionId}
                onChange={setFocusPositionId}
                recentPositionIds={recentPositionIds}
                index={index}
                onAddCustomPosition={addCustomPosition}
              />
            ) : (
              <TechniquePicker
                value={focusTechniqueId}
                positionId={null}
                onChange={setFocusTechniqueId}
                recentTechniqueIds={recentTechniqueIds}
                index={index}
                onAddCustomTechnique={addCustomTechnique}
              />
            )}

            <label className="block space-y-2 text-sm font-medium text-[var(--muted-strong)]">
              Focus notes (optional)
              <textarea
                value={focusNotes}
                onChange={(event) => setFocusNotes(event.target.value)}
                rows={3}
                placeholder="What clicked today?"
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--line-strong)]"
              />
            </label>
          </div>

          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--line-strong)]"
              />
            </label>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Gi status
              </p>
              <div className="flex flex-wrap gap-2">
                {giOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGiOrNogi(option.value)}
                    className={`rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      giOrNogi === option.value
                        ? "bg-[var(--foreground)] text-[var(--background)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)] sm:col-span-2">
              Session type
              <select
                value={sessionType}
                onChange={(event) => setSessionType(event.target.value as SessionType)}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--line-strong)]"
              >
                {sessionTypes.map((type) => (
                  <option key={type} value={type}>
                    {sessionTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_28px_70px_-48px_var(--shadow)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Taps
              </p>
              <span className="text-xs text-[var(--muted)]">
                {displayDateLabel}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <Counter label="You tapped" value={tapsFor} onChange={setTapsFor} />
              <Counter
                label="You got tapped"
                value={tapsAgainst}
                onChange={setTapsAgainst}
              />
            </div>
            <div className="mt-6 space-y-3">
              {formError ? (
                <p className="text-sm font-semibold text-red-600">{formError}</p>
              ) : null}
              <Button
                variant="accent"
                size="lg"
                onClick={handleSave}
                className="w-full uppercase tracking-[0.25em]"
              >
                {saved ? "Saved" : "Save log"}
              </Button>
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>
                  {focusLabel ? `Focus: ${focusLabel}` : "No focus selected yet."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTapsFor(0);
                    setTapsAgainst(0);
                  }}
                  className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                >
                  Reset taps
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-5 text-xs uppercase tracking-[0.35em] text-[var(--muted)]">
            Keep it honest. Log what happened, then move on.
          </div>
        </section>
      </div>
    </div>
  );
}
