"use client";

import { useState } from "react";
import Link from "next/link";

import {
  getTechniquesByPosition,
  positionsInTreeOrder,
  techniques,
} from "@/lib/taxonomy";
import type { ConfidenceLevel, Session, SessionTechnique } from "@/lib/types";
import { createId } from "@/lib/utils";
import { useLocalSessions } from "@/hooks/use-local-sessions";

const sessionTypes = [
  "regular-class",
  "open-mat",
  "private",
  "competition",
  "seminar",
  "drilling-only",
] as const;

const positionOptions = positionsInTreeOrder;

type DraftTechnique = {
  id: string;
  positionId: string | null;
  positionNameOverride: string;
  techniqueId: string | null;
  techniqueNameOverride: string;
  wasNew: boolean;
  confidence: ConfidenceLevel;
  notes: string;
  keyDetailsInput: string;
};

function createDraftTechnique(): DraftTechnique {
  return {
    id: createId(),
    positionId: null,
    positionNameOverride: "",
    techniqueId: null,
    techniqueNameOverride: "",
    wasNew: false,
    confidence: 3,
    notes: "",
    keyDetailsInput: "",
  };
}

export default function LogSessionPage() {
  const { addSession } = useLocalSessions();
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [sessionType, setSessionType] = useState<
    (typeof sessionTypes)[number]
  >(sessionTypes[0]);
  const [giOrNogi, setGiOrNogi] = useState<"gi" | "nogi" | "both">("gi");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [energyLevel, setEnergyLevel] = useState<ConfidenceLevel | "">("");
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
    setEnergyLevel("");
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

    const now = new Date().toISOString();
    const sessionId = createId();

    const techniquesDrilled: SessionTechnique[] = techniqueDrafts
      .map((draft) => {
        const keyDetails = draft.keyDetailsInput
          .split(",")
          .map((detail) => detail.trim())
          .filter(Boolean);

        return {
          id: createId(),
          sessionId,
          techniqueId: draft.techniqueId,
          techniqueNameOverride:
            draft.techniqueId || draft.techniqueNameOverride.trim().length === 0
              ? null
              : draft.techniqueNameOverride.trim(),
          positionId: draft.positionId,
          positionNameOverride:
            draft.positionNameOverride.trim().length === 0
              ? null
              : draft.positionNameOverride.trim(),
          wasNew: draft.wasNew,
          confidence: draft.confidence,
          notes: draft.notes.trim(),
          keyDetailsLearned: keyDetails,
        };
      })
      .filter(
        (item) => item.techniqueId || item.techniqueNameOverride !== null,
      );

    const session: Session = {
      id: sessionId,
      userId: "local",
      date,
      sessionType,
      giOrNogi,
      durationMinutes: durationMinutes === "" ? null : durationMinutes,
      energyLevel: energyLevel === "" ? null : energyLevel,
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
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              Energy level
              <select
                value={energyLevel}
                onChange={(event) =>
                  setEnergyLevel(
                    event.target.value === ""
                      ? ""
                      : (Number(event.target.value) as ConfidenceLevel),
                  )
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Optional</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Techniques drilled</h2>
            <button
              type="button"
              onClick={addTechnique}
              className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Add technique
            </button>
          </div>

          <div className="space-y-4">
            {techniqueDrafts.map((draft, index) => {
              const availableTechniques = draft.positionId
                ? getTechniquesByPosition(draft.positionId)
                : techniques;

              return (
                <div
                  key={draft.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-700">
                      Technique {index + 1}
                    </p>
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
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-zinc-700">
                      Position
                      <select
                        value={draft.positionId ?? ""}
                        onChange={(event) =>
                          updateTechnique(draft.id, {
                            positionId: event.target.value || null,
                            techniqueId: null,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select position</option>
                        {positionOptions.map((position) => {
                          const depth = position.path.length - 1;
                          const prefix = depth > 0 ? `${"-".repeat(depth)} ` : "";
                          return (
                            <option key={position.id} value={position.id}>
                              {prefix}
                              {position.name}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-zinc-700">
                      Position detail (optional)
                      <input
                        value={draft.positionNameOverride}
                        onChange={(event) =>
                          updateTechnique(draft.id, {
                            positionNameOverride: event.target.value,
                          })
                        }
                        placeholder="e.g. Octopus guard"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-zinc-700">
                      Technique
                      <select
                        value={draft.techniqueId ?? ""}
                        onChange={(event) =>
                          updateTechnique(draft.id, {
                            techniqueId: event.target.value || null,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select technique</option>
                        {availableTechniques.map((technique) => (
                          <option key={technique.id} value={technique.id}>
                            {technique.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-zinc-700">
                      Custom name (optional)
                      <input
                        value={draft.techniqueNameOverride}
                        onChange={(event) =>
                          updateTechnique(draft.id, {
                            techniqueNameOverride: event.target.value,
                          })
                        }
                        placeholder="e.g. Knee shield entry"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-zinc-700">
                      Confidence
                      <select
                        value={draft.confidence}
                        onChange={(event) =>
                          updateTechnique(draft.id, {
                            confidence: Number(event.target.value) as ConfidenceLevel,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                      <input
                        type="checkbox"
                        checked={draft.wasNew}
                        onChange={(event) =>
                          updateTechnique(draft.id, { wasNew: event.target.checked })
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      New to me
                    </label>
                    <label className="space-y-2 text-sm font-medium text-zinc-700">
                      Notes
                      <input
                        value={draft.notes}
                        onChange={(event) =>
                          updateTechnique(draft.id, { notes: event.target.value })
                        }
                        placeholder="Short reminder"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-zinc-700 sm:col-span-2">
                      Key details (comma separated)
                      <input
                        value={draft.keyDetailsInput}
                        onChange={(event) =>
                          updateTechnique(draft.id, {
                            keyDetailsInput: event.target.value,
                          })
                        }
                        placeholder="hip angle, underhook, base"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
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
