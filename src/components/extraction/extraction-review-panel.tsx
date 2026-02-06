"use client";

import type {
  MatchedExtraction,
  MatchedTechnique,
  MatchedPositionNote,
  MatchedSparringRound,
  MatchedSubmission,
} from "@/lib/extraction/match-taxonomy";

export type UnmatchedItem = {
  type: "position" | "technique";
  name: string;
  context?: {
    positionId?: string;
    positionName?: string;
  };
};

type Props = {
  extraction: MatchedExtraction;
  onApply: () => void;
  onDismiss: () => void;
  onCreateUnmatched?: (item: UnmatchedItem) => void;
};

function ConfidenceBadge({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  const color =
    score >= 0.8
      ? "bg-[rgba(46,242,196,0.18)] text-[var(--gg-signal)]"
      : score >= 0.6
        ? "bg-[rgba(255,179,71,0.2)] text-[var(--gg-warning)]"
        : "bg-[rgba(255,91,91,0.2)] text-[var(--gg-danger)]";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {percent}%
    </span>
  );
}

function NoMatchBadge() {
  return (
    <span className="rounded-full border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-2 py-0.5 text-xs font-semibold text-[var(--gg-text-muted)]">
      No match
    </span>
  );
}

function CreateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-2 py-0.5 text-xs font-semibold text-black transition hover:brightness-110"
    >
      Create
    </button>
  );
}

function TechniqueItem({
  item,
  onCreatePosition,
  onCreateTechnique,
}: {
  item: MatchedTechnique;
  onCreatePosition?: () => void;
  onCreateTechnique?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--gg-text)]">
            {item.positionMatch?.item.name ?? item.positionName}
            {item.techniqueMatch ? ` → ${item.techniqueMatch.item.name}` : item.techniqueName ? ` → ${item.techniqueName}` : ""}
          </p>
          {item.notes ? (
            <p className="text-xs text-[var(--gg-text-muted)]">{item.notes}</p>
          ) : null}
          {item.keyDetails.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.keyDetails.map((detail, i) => (
                <span
                  key={i}
                  className="rounded-full bg-[var(--gg-surface-1)] px-2 py-0.5 text-xs text-[var(--gg-text-muted)]"
                >
                  {detail}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {item.positionMatch ? (
            <ConfidenceBadge score={item.positionMatch.score} />
          ) : (
            <>
              <NoMatchBadge />
              {onCreatePosition && <CreateButton onClick={onCreatePosition} />}
            </>
          )}
          {item.techniqueName && (
            item.techniqueMatch ? (
              <ConfidenceBadge score={item.techniqueMatch.score} />
            ) : (
              <>
                <NoMatchBadge />
                {onCreateTechnique && item.positionMatch && (
                  <CreateButton onClick={onCreateTechnique} />
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PositionNoteItem({
  item,
  onCreatePosition,
}: {
  item: MatchedPositionNote;
  onCreatePosition?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--gg-text)]">
            {item.positionMatch?.item.name ?? item.positionName}
          </p>
          {item.notes ? (
            <p className="text-xs text-[var(--gg-text-muted)]">{item.notes}</p>
          ) : null}
          {item.keyDetails.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.keyDetails.map((detail, i) => (
                <span
                  key={i}
                  className="rounded-full bg-[var(--gg-surface-1)] px-2 py-0.5 text-xs text-[var(--gg-text-muted)]"
                >
                  {detail}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {item.positionMatch ? (
            <ConfidenceBadge score={item.positionMatch.score} />
          ) : (
            <>
              <NoMatchBadge />
              {onCreatePosition && <CreateButton onClick={onCreatePosition} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionItem({ item }: { item: MatchedSubmission }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-[var(--gg-border)] bg-[var(--gg-surface-1)] px-2 py-0.5 text-xs">
      <span className="text-[var(--gg-text)]">
        {item.techniqueMatch?.item.name ?? item.name}
      </span>
      {item.techniqueMatch ? (
        <ConfidenceBadge score={item.techniqueMatch.score} />
      ) : null}
    </span>
  );
}

function RoundItem({
  item,
  index,
}: {
  item: MatchedSparringRound;
  index: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] p-3">
      <p className="text-sm font-semibold text-[var(--gg-text)]">
        Round {index + 1}
        {item.partnerName ? ` vs ${item.partnerName}` : ""}
        {item.partnerBelt ? ` (${item.partnerBelt})` : ""}
      </p>

      {item.submissionsFor.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-[var(--gg-text-muted)]">
            I submitted: {item.submissionsFor.length}
          </p>
          <div className="flex flex-wrap gap-1">
            {item.submissionsFor.map((sub, i) => (
              <SubmissionItem key={i} item={sub} />
            ))}
          </div>
        </div>
      ) : null}

      {item.submissionsAgainst.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-[var(--gg-text-muted)]">
            I got caught: {item.submissionsAgainst.length}
          </p>
          <div className="flex flex-wrap gap-1">
            {item.submissionsAgainst.map((sub, i) => (
              <SubmissionItem key={i} item={sub} />
            ))}
          </div>
        </div>
      ) : null}

      {item.dominantPositions.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-[var(--gg-text-muted)]">Dominated:</p>
          <div className="flex flex-wrap gap-1">
            {item.dominantPositions.map((pos, i) => (
              <span
                key={i}
                className="rounded-full bg-[rgba(46,242,196,0.16)] px-2 py-0.5 text-xs text-[var(--gg-signal)]"
              >
                {pos}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {item.stuckPositions.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-[var(--gg-text-muted)]">Got stuck:</p>
          <div className="flex flex-wrap gap-1">
            {item.stuckPositions.map((pos, i) => (
              <span
                key={i}
                className="rounded-full bg-[rgba(255,91,91,0.18)] px-2 py-0.5 text-xs text-[var(--gg-danger)]"
              >
                {pos}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {item.notes ? (
        <p className="mt-2 text-xs text-[var(--gg-text-muted)]">{item.notes}</p>
      ) : null}
    </div>
  );
}

export function ExtractionReviewPanel({
  extraction,
  onApply,
  onDismiss,
  onCreateUnmatched,
}: Props) {
  const { session, sparringRounds } = extraction;

  const hasTechniques = session.techniques.length > 0;
  const hasPositionNotes = session.positionNotes.length > 0;
  const hasRounds = sparringRounds.length > 0;

  const hasUnmatchedPositions =
    session.techniques.some((t) => !t.positionMatch) ||
    session.positionNotes.some((n) => !n.positionMatch);
  const hasUnmatchedTechniques = session.techniques.some(
    (t) => t.techniqueName && !t.techniqueMatch,
  );
  const hasUnmatchedSubmissions = sparringRounds.some(
    (r) =>
      r.submissionsFor.some((s) => !s.techniqueMatch) ||
      r.submissionsAgainst.some((s) => !s.techniqueMatch),
  );

  const hasUnmatched =
    hasUnmatchedPositions || hasUnmatchedTechniques || hasUnmatchedSubmissions;

  return (
    <div className="space-y-4 rounded-xl border border-[rgba(46,242,196,0.35)] bg-[rgba(18,23,28,0.92)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--gg-text)]">
            Extracted from transcript
          </h3>
          <p className="text-xs text-[var(--gg-text-muted)]">
            Review the extracted data and apply to pre-fill the form.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-[var(--gg-border)] px-3 py-1 text-xs font-semibold text-[var(--gg-text-muted)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-text)]"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-3 py-1 text-xs font-semibold text-black transition hover:brightness-110"
          >
            Apply to form
          </button>
        </div>
      </div>

      {hasUnmatched ? (
        <p className="text-xs text-[var(--gg-text-muted)]">
          Some items could not be matched. Click &quot;Create&quot; to add them to your taxonomy, or apply and fix later.
        </p>
      ) : null}

      {session.date || session.giOrNogi || session.sessionType ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gg-text-muted)]">
            Session Info
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--gg-text)]">
            {session.date ? <span>Date: {session.date}</span> : null}
            {session.giOrNogi ? <span>• {session.giOrNogi.toUpperCase()}</span> : null}
            {session.sessionType ? <span>• {session.sessionType}</span> : null}
          </div>
        </div>
      ) : null}

      {hasTechniques ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gg-text-muted)]">
            Techniques ({session.techniques.length})
          </p>
          <div className="space-y-2">
            {session.techniques.map((tech) => (
              <TechniqueItem
                key={tech.id}
                item={tech}
                onCreatePosition={
                  !tech.positionMatch && onCreateUnmatched
                    ? () =>
                        onCreateUnmatched({
                          type: "position",
                          name: tech.positionName,
                        })
                    : undefined
                }
                onCreateTechnique={
                  tech.positionMatch && tech.techniqueName && !tech.techniqueMatch && onCreateUnmatched
                    ? () =>
                        onCreateUnmatched({
                          type: "technique",
                          name: tech.techniqueName,
                          context: {
                            positionId: tech.positionMatch!.item.id,
                            positionName: tech.positionMatch!.item.name,
                          },
                        })
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {hasPositionNotes ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gg-text-muted)]">
            Position Notes ({session.positionNotes.length})
          </p>
          <div className="space-y-2">
            {session.positionNotes.map((note) => (
              <PositionNoteItem
                key={note.id}
                item={note}
                onCreatePosition={
                  !note.positionMatch && onCreateUnmatched
                    ? () =>
                        onCreateUnmatched({
                          type: "position",
                          name: note.positionName,
                        })
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {hasRounds ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gg-text-muted)]">
            Sparring Rounds ({sparringRounds.length})
          </p>
          <div className="space-y-2">
            {sparringRounds.map((round, i) => (
              <RoundItem key={round.id} item={round} index={i} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
