"use client";

import { useCallback, useState } from "react";

import type { BeltLevel, Partner, RoundSubmission, Technique } from "@/lib/types";
import type { buildTaxonomyIndex } from "@/lib/taxonomy";

type TaxonomyIndex = ReturnType<typeof buildTaxonomyIndex>;
import { Button, Card, Modal, Tag } from "@/components/ui";
import { PartnerPicker } from "./partner-picker";
import { DraftRound, beltOptions, getBeltOption, createDraftRound } from "./types";

type SparringRoundSectionProps = {
  rounds: DraftRound[];
  onRoundsChange: (rounds: DraftRound[]) => void;
  index: TaxonomyIndex;
  partners: Partner[];
  partnerSuggestions: string[];
  submissionTechniques: Technique[];
  commonSubmissionIds: string[];
  recentSubmissionIds: string[];
  onOpenPositionPicker: (roundId: string, type: "dominant" | "stuck") => void;
};

export function SparringRoundSection({
  rounds,
  onRoundsChange,
  index,
  partners,
  partnerSuggestions,
  submissionTechniques,
  commonSubmissionIds,
  recentSubmissionIds,
  onOpenPositionPicker,
}: SparringRoundSectionProps) {
  const [beltPickerRoundId, setBeltPickerRoundId] = useState<string | null>(null);
  const [submissionPicker, setSubmissionPicker] = useState<{
    roundId: string;
    side: "for" | "against";
  } | null>(null);
  const [submissionSearch, setSubmissionSearch] = useState("");

  const addRound = useCallback(() => {
    onRoundsChange([...rounds, createDraftRound()]);
  }, [rounds, onRoundsChange]);

  const removeRound = useCallback(
    (id: string) => {
      const round = rounds.find((r) => r.id === id);
      if (!round) return;

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

      onRoundsChange(rounds.filter((r) => r.id !== id));
    },
    [rounds, onRoundsChange]
  );

  const updateRound = useCallback(
    (id: string, update: Partial<DraftRound>) => {
      onRoundsChange(
        rounds.map((round) =>
          round.id === id ? { ...round, ...update } : round
        )
      );
    },
    [rounds, onRoundsChange]
  );

  const incrementSubmissionCount = useCallback(
    (roundId: string, side: "for" | "against") => {
      onRoundsChange(
        rounds.map((round) => {
          if (round.id !== roundId) return round;
          const countKey = side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
          return { ...round, [countKey]: round[countKey] + 1 };
        })
      );
    },
    [rounds, onRoundsChange]
  );

  const decrementSubmissionCount = useCallback(
    (roundId: string, side: "for" | "against") => {
      onRoundsChange(
        rounds.map((round) => {
          if (round.id !== roundId) return round;
          const countKey = side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
          const listKey = side === "for" ? "submissionsFor" : "submissionsAgainst";
          if (round[countKey] === 0) return round;

          const nextCount = round[countKey] - 1;
          if (nextCount < round[listKey].length) {
            const message =
              round[listKey].length === 1
                ? "Clear the logged submission?"
                : "Reduce the count and remove a submission detail?";
            if (!window.confirm(message)) return round;
            return {
              ...round,
              [countKey]: nextCount,
              [listKey]: round[listKey].slice(0, nextCount),
            };
          }
          return { ...round, [countKey]: nextCount };
        })
      );
    },
    [rounds, onRoundsChange]
  );

  const removeSubmission = useCallback(
    (roundId: string, side: "for" | "against", submissionId: string) => {
      onRoundsChange(
        rounds.map((round) => {
          if (round.id !== roundId) return round;
          const listKey = side === "for" ? "submissionsFor" : "submissionsAgainst";
          const countKey = side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
          const next = round[listKey].filter((s) => s.id !== submissionId);
          const nextCount =
            round[countKey] === round[listKey].length
              ? Math.max(0, round[countKey] - 1)
              : round[countKey];
          return {
            ...round,
            [listKey]: next,
            [countKey]: Math.max(nextCount, next.length),
          };
        })
      );
    },
    [rounds, onRoundsChange]
  );

  const toggleRoundPosition = useCallback(
    (roundId: string, type: "dominant" | "stuck", positionId: string) => {
      onRoundsChange(
        rounds.map((round) => {
          if (round.id !== roundId) return round;
          const key = type === "dominant" ? "dominantPositions" : "stuckPositions";
          const list = round[key];
          const next = list.includes(positionId)
            ? list.filter((id) => id !== positionId)
            : [...list, positionId];
          return { ...round, [key]: next };
        })
      );
    },
    [rounds, onRoundsChange]
  );

  const addSubmission = useCallback(
    (roundId: string, side: "for" | "against", techniqueId: string, positionId: string | null) => {
      const { createId } = require("@/lib/utils");
      const submission: RoundSubmission = {
        id: createId(),
        techniqueId,
        positionId,
      };
      onRoundsChange(
        rounds.map((round) => {
          if (round.id !== roundId) return round;
          const listKey = side === "for" ? "submissionsFor" : "submissionsAgainst";
          const countKey = side === "for" ? "submissionsForCount" : "submissionsAgainstCount";
          return {
            ...round,
            [listKey]: [...round[listKey], submission],
            [countKey]: Math.max(round[countKey], round[listKey].length + 1),
          };
        })
      );
      setSubmissionPicker(null);
      setSubmissionSearch("");
    },
    [rounds, onRoundsChange]
  );

  // Filter submissions for search
  const searchQuery = submissionSearch.trim().toLowerCase();
  const filteredSubmissions = searchQuery
    ? submissionTechniques.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery) ||
          t.aliases?.some((a) => a.toLowerCase().includes(searchQuery))
      )
    : [];

  const recentSubmissions = recentSubmissionIds
    .map((id) => submissionTechniques.find((t) => t.id === id))
    .filter((t): t is Technique => t !== undefined)
    .slice(0, 5);

  const commonSubmissions = commonSubmissionIds
    .map((id) => submissionTechniques.find((t) => t.id === id))
    .filter((t): t is Technique => t !== undefined);

  return (
    <>
      <Card as="section" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Sparring rounds</h2>
          <Button onClick={addRound}>Add round</Button>
        </div>

        {rounds.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Optional. Add rounds to capture sparring notes and outcomes.
          </p>
        ) : (
          <div className="space-y-4">
            {rounds.map((round, roundIndex) => {
              const belt = getBeltOption(round.partnerBelt);

              return (
                <div
                  key={round.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-zinc-700">
                      Round {roundIndex + 1}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRound(round.id)}
                      className="hover:text-red-500"
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 text-sm font-medium text-zinc-700">
                      <span>Partner</span>
                      <PartnerPicker
                        value={round.partnerName}
                        onChange={(name, partnerBelt) =>
                          updateRound(round.id, {
                            partnerName: name,
                            ...(partnerBelt !== null ? { partnerBelt } : {}),
                          })
                        }
                        partners={partners}
                        partnerSuggestions={partnerSuggestions}
                      />
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
                        <span className="text-xs text-zinc-400">▼</span>
                      </button>
                    </div>
                  </div>

                  {/* Submissions */}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {([
                      { label: "I submitted", side: "for" as const },
                      { label: "I got caught", side: "against" as const },
                    ]).map(({ label, side }) => {
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
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => decrementSubmissionCount(round.id, side)}
                            >
                              -
                            </Button>
                            <span className="text-lg font-semibold text-zinc-800">
                              {submissionCount}
                            </span>
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => incrementSubmissionCount(round.id, side)}
                            >
                              +
                            </Button>
                          </div>

                          {submissions.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {submissions.map((submission) => {
                                const technique = index.techniquesById.get(
                                  submission.techniqueId
                                );
                                const position = submission.positionId
                                  ? index.positionsById.get(submission.positionId)
                                  : null;
                                const labelText = position
                                  ? `${technique?.name ?? "Unknown"} (${position.name})`
                                  : technique?.name ?? "Unknown";

                                return (
                                  <Tag
                                    key={submission.id}
                                    variant="amber"
                                    onRemove={() =>
                                      removeSubmission(round.id, side, submission.id)
                                    }
                                  >
                                    {labelText}
                                  </Tag>
                                );
                              })}
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => {
                              setSubmissionPicker({ roundId: round.id, side });
                              setSubmissionSearch("");
                            }}
                            className="mt-3 text-xs font-semibold text-zinc-500"
                          >
                            Add submission detail
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Position notes toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      updateRound(round.id, { notesExpanded: !round.notesExpanded })
                    }
                    className="mt-4 text-xs font-semibold text-zinc-500"
                  >
                    {round.notesExpanded ? "Collapse position notes" : "Add position notes"}
                  </button>

                  {round.notesExpanded ? (
                    <div className="mt-4 space-y-4 rounded-xl border border-zinc-100 bg-white p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Dominant positions */}
                        <div className="space-y-2 text-sm font-medium text-zinc-700">
                          <div className="flex items-center justify-between">
                            <span>Where I dominated</span>
                            <button
                              type="button"
                              onClick={() => onOpenPositionPicker(round.id, "dominant")}
                              className="text-xs font-semibold text-amber-600"
                            >
                              Add position
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {round.dominantPositions.map((positionId) => (
                              <Tag
                                key={positionId}
                                variant="zinc"
                                onRemove={() =>
                                  toggleRoundPosition(round.id, "dominant", positionId)
                                }
                              >
                                {index.positionsById.get(positionId)?.name ?? positionId}
                              </Tag>
                            ))}
                            {round.dominantPositions.length === 0 ? (
                              <span className="text-xs text-zinc-400">None yet.</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Stuck positions */}
                        <div className="space-y-2 text-sm font-medium text-zinc-700">
                          <div className="flex items-center justify-between">
                            <span>Where I got stuck</span>
                            <button
                              type="button"
                              onClick={() => onOpenPositionPicker(round.id, "stuck")}
                              className="text-xs font-semibold text-amber-600"
                            >
                              Add position
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {round.stuckPositions.map((positionId) => (
                              <Tag
                                key={positionId}
                                variant="zinc"
                                onRemove={() =>
                                  toggleRoundPosition(round.id, "stuck", positionId)
                                }
                              >
                                {index.positionsById.get(positionId)?.name ?? positionId}
                              </Tag>
                            ))}
                            {round.stuckPositions.length === 0 ? (
                              <span className="text-xs text-zinc-400">None yet.</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Round notes */}
                      <label className="block space-y-2 text-sm font-medium text-zinc-700">
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
      </Card>

      {/* Belt Picker Modal */}
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
              <span className={`h-3 w-3 rounded-full border ${option.dotClass}`} />
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
            className="w-full rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500"
          >
            Clear selection
          </button>
        </div>
      </Modal>

      {/* Submission Picker Modal */}
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
            placeholder="Search submissions..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            autoFocus
          />

          {searchQuery ? (
            <div className="space-y-1">
              {filteredSubmissions.slice(0, 10).map((technique) => (
                <button
                  key={technique.id}
                  type="button"
                  onClick={() => {
                    if (submissionPicker) {
                      addSubmission(
                        submissionPicker.roundId,
                        submissionPicker.side,
                        technique.id,
                        technique.positionFromId
                      );
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <span>{technique.name}</span>
                  <span className="text-xs text-zinc-400">
                    {index.positionsById.get(technique.positionFromId)?.name}
                  </span>
                </button>
              ))}
              {filteredSubmissions.length === 0 ? (
                <p className="py-2 text-center text-sm text-zinc-500">
                  No submissions found.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              {recentSubmissions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Recent
                  </p>
                  <div className="space-y-1">
                    {recentSubmissions.map((technique) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() => {
                          if (submissionPicker) {
                            addSubmission(
                              submissionPicker.roundId,
                              submissionPicker.side,
                              technique.id,
                              technique.positionFromId
                            );
                          }
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                      >
                        <span>{technique.name}</span>
                        <span className="text-xs text-zinc-400">
                          {index.positionsById.get(technique.positionFromId)?.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Common
                </p>
                <div className="space-y-1">
                  {commonSubmissions.map((technique) => (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() => {
                        if (submissionPicker) {
                          addSubmission(
                            submissionPicker.roundId,
                            submissionPicker.side,
                            technique.id,
                            technique.positionFromId
                          );
                        }
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    >
                      <span>{technique.name}</span>
                      <span className="text-xs text-zinc-400">
                        {index.positionsById.get(technique.positionFromId)?.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
