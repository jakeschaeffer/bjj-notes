"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PositionPicker } from "@/components/positions/position-picker";
import { TechniquePicker } from "@/components/techniques/technique-picker";
import { TagPicker } from "@/components/techniques/tag-picker";
import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import { COMMON_TAGS, normalizeTag } from "@/lib/taxonomy/tags";
import type { Session, SessionTechnique, Technique } from "@/lib/types";
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
  const {
    index,
    tagSuggestions,
    addCustomPosition,
    addCustomTechnique,
    recordTagUsage,
    recordTechniqueProgress,
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
  const [sparringRounds, setSparringRounds] = useState(0);
  const [subsAchieved, setSubsAchieved] = useState(0);
  const [subsReceived, setSubsReceived] = useState(0);
  const [sparringNotes, setSparringNotes] = useState("");
  const [techniqueDrafts, setTechniqueDrafts] = useState<DraftTechnique[]>([
    createDraftTechnique(),
  ]);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  const recentPositionIds = useMemo(() => {
    return getRecentIds(
      sessions.flatMap((session) => session.techniques),
      (technique) => technique.positionId,
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

  function resetForm() {
    setDate(new Date().toISOString().slice(0, 10));
    setSessionType(sessionTypes[0]);
    setGiOrNogi("gi");
    setDurationMinutes("");
    setNotes("");
    setInsights("");
    setGoalsForNext("");
    setSparringRounds(0);
    setSubsAchieved(0);
    setSubsReceived(0);
    setSparringNotes("");
    setTechniqueDrafts([createDraftTechnique()]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    const incomplete = techniqueDrafts.filter(
      (draft) => !draft.positionId || !draft.techniqueId,
    );

    if (incomplete.length > 0) {
      setFormError("Select a position and technique for each entry.");
      return;
    }

    const now = new Date().toISOString();
    const sessionId = createId();

    const techniquesDrilled: SessionTechnique[] = techniqueDrafts.map((draft) => ({
      id: createId(),
      sessionId,
      positionId: draft.positionId as string,
      techniqueId: draft.techniqueId as string,
      keyDetails: draft.keyDetails,
      notes: draft.notes.trim(),
    }));

    const session: Session = {
      id: sessionId,
      userId: "local",
      date,
      sessionType,
      giOrNogi,
      durationMinutes: durationMinutes === "" ? null : durationMinutes,
      energyLevel: null,
      techniques: techniquesDrilled,
      notes: notes.trim(),
      insights: insights
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      goalsForNext: goalsForNext
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      sparringRounds,
      subsAchieved,
      subsReceived,
      sparringNotes: sparringNotes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    addSession(session);
    recordTechniqueProgress(
      techniquesDrilled.map((item) => item.techniqueId),
      now,
    );
    recordTagUsage(
      techniquesDrilled.flatMap((item) => item.keyDetails),
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
                    <span>Technique</span>
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

        <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Sparring summary</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Rounds
              <input
                type="number"
                min={0}
                value={sparringRounds}
                onChange={(event) => setSparringRounds(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Subs achieved
              <input
                type="number"
                min={0}
                value={subsAchieved}
                onChange={(event) => setSubsAchieved(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Subs received
              <input
                type="number"
                min={0}
                value={subsReceived}
                onChange={(event) => setSubsReceived(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Sparring notes
            <textarea
              value={sparringNotes}
              onChange={(event) => setSparringNotes(event.target.value)}
              className="min-h-[90px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="What worked or failed in rounds"
            />
          </label>
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
