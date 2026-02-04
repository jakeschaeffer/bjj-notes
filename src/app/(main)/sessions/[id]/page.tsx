"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { useLocalSessions } from "@/hooks/use-local-sessions";
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getSessionById, deleteSession } = useLocalSessions();
  const { index } = useUserTaxonomy();
  const sessionId = params?.id;
  const session = sessionId ? getSessionById(sessionId) : undefined;

  if (!session) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Session not found</h1>
        <p className="mt-2 text-sm text-zinc-600">
          That session does not exist or has been deleted.
        </p>
        <Link
          href="/sessions"
          className="mt-4 inline-flex rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          Back to sessions
        </Link>
      </div>
    );
  }

  const roundCount = session.sparringRounds.length;
  const subsForCount = session.sparringRounds.reduce(
    (sum, round) =>
      sum +
      (typeof round.submissionsForCount === "number"
        ? round.submissionsForCount
        : round.submissionsFor.length),
    0,
  );
  const subsAgainstCount = session.sparringRounds.reduce(
    (sum, round) =>
      sum +
      (typeof round.submissionsAgainstCount === "number"
        ? round.submissionsAgainstCount
        : round.submissionsAgainst.length),
    0,
  );
  const useLegacy = roundCount === 0 && session.legacySparring;
  const displayRounds = useLegacy
    ? session.legacySparring?.rounds ?? 0
    : roundCount;
  const displaySubsFor = useLegacy
    ? session.legacySparring?.subsAchieved ?? 0
    : subsForCount;
  const displaySubsAgainst = useLegacy
    ? session.legacySparring?.subsReceived ?? 0
    : subsAgainstCount;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Session Detail
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {format(new Date(session.date), "MMM d, yyyy")}
          </h1>
          <p className="text-sm text-zinc-600">
            {session.sessionType.replace(/-/g, " ")} - {session.giOrNogi}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sessions"
            className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={() => {
              deleteSession(session.id);
              router.push("/sessions");
            }}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>

      <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Summary</h2>
        <div className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
          <p>Duration: {session.durationMinutes ?? "-"} minutes</p>
          <p>Energy: {session.energyLevel ?? "-"}</p>
          <p>Rounds: {displayRounds}</p>
          <p>Subs: +{displaySubsFor} / -{displaySubsAgainst}</p>
        </div>
        {useLegacy && session.legacySparring?.notes ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Sparring notes
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              {session.legacySparring.notes}
            </p>
          </div>
        ) : null}
      </section>

      {roundCount > 0 ? (
        <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Sparring rounds</h2>
          <div className="space-y-4">
            {session.sparringRounds.map((round, indexValue) => {
              const beltLabel = round.partnerBelt
                ? round.partnerBelt.replace(/^\w/, (value) => value.toUpperCase())
                : "Unknown";
              return (
                <div
                  key={round.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-800">
                      Round {indexValue + 1}
                    </h3>
                    <span className="text-xs font-semibold text-zinc-500">
                      {round.partnerName || "Partner unknown"} • {beltLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                        I submitted
                      </p>
                      {round.submissionsFor.length === 0 ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          {round.submissionsForCount > 0
                            ? `Count: ${round.submissionsForCount} (details not logged)`
                            : "None logged."}
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <ul className="space-y-1">
                            {round.submissionsFor.map((submission) => {
                              const technique = index.techniquesById.get(
                                submission.techniqueId,
                              );
                              const position = submission.positionId
                                ? index.positionsById.get(submission.positionId)
                                : null;
                              return (
                                <li key={submission.id}>
                                  {technique?.name ?? "Unknown submission"}
                                  {position ? ` (${position.name})` : ""}
                                </li>
                              );
                            })}
                          </ul>
                          {round.submissionsForCount > round.submissionsFor.length ? (
                            <p className="text-xs text-zinc-500">
                              Additional unlogged:{" "}
                              {round.submissionsForCount - round.submissionsFor.length}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                        I got caught
                      </p>
                      {round.submissionsAgainst.length === 0 ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          {round.submissionsAgainstCount > 0
                            ? `Count: ${round.submissionsAgainstCount} (details not logged)`
                            : "None logged."}
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <ul className="space-y-1">
                            {round.submissionsAgainst.map((submission) => {
                              const technique = index.techniquesById.get(
                                submission.techniqueId,
                              );
                              const position = submission.positionId
                                ? index.positionsById.get(submission.positionId)
                                : null;
                              return (
                                <li key={submission.id}>
                                  {technique?.name ?? "Unknown submission"}
                                  {position ? ` (${position.name})` : ""}
                                </li>
                              );
                            })}
                          </ul>
                          {round.submissionsAgainstCount >
                          round.submissionsAgainst.length ? (
                            <p className="text-xs text-zinc-500">
                              Additional unlogged:{" "}
                              {round.submissionsAgainstCount -
                                round.submissionsAgainst.length}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  {(round.dominantPositions.length > 0 ||
                    round.stuckPositions.length > 0) && (
                    <div className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          Dominated
                        </p>
                        <p className="mt-1">
                          {round.dominantPositions
                            .map(
                              (positionId) =>
                                index.positionsById.get(positionId)?.name ??
                                positionId,
                            )
                            .join(", ") || "None"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          Got stuck
                        </p>
                        <p className="mt-1">
                          {round.stuckPositions
                            .map(
                              (positionId) =>
                                index.positionsById.get(positionId)?.name ??
                                positionId,
                            )
                            .join(", ") || "None"}
                        </p>
                      </div>
                    </div>
                  )}
                  {round.notes ? (
                    <p className="mt-3 text-sm text-zinc-600">{round.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Techniques</h2>
        {session.techniques.length === 0 ? (
          <p className="text-sm text-zinc-600">No techniques logged.</p>
        ) : (
          <div className="grid gap-3">
            {session.techniques.map((technique) => {
              const techniqueInfo = index.techniquesById.get(
                technique.techniqueId,
              );
              const positionInfo = technique.positionId
                ? index.positionsById.get(technique.positionId)
                : null;
              const keyDetails = technique.keyDetails ?? [];

              return (
                <div
                  key={technique.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-800">
                      {techniqueInfo?.name ?? "Unknown technique"}
                    </h3>
                    {techniqueInfo ? (
                      <span className="text-xs font-semibold text-amber-600">
                        {techniqueInfo.category.replace(/-/g, " ")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {positionInfo?.name ?? "Position not set"}
                  </div>
                  {keyDetails.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {keyDetails.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {technique.notes ? (
                    <p className="mt-2 text-sm text-zinc-600">
                      {technique.notes}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {session.positionNotes.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Position notes</h2>
          <div className="grid gap-3">
            {session.positionNotes.map((note) => {
              const positionInfo = index.positionsById.get(note.positionId);
              return (
                <div
                  key={note.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <h3 className="text-sm font-semibold text-zinc-800">
                    {positionInfo?.name ?? "Unknown position"}
                  </h3>
                  {note.keyDetails.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {note.keyDetails.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {note.notes ? (
                    <p className="mt-2 text-sm text-zinc-600">{note.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {(session.notes || session.insights.length > 0 || session.goalsForNext.length > 0) && (
        <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Notes</h2>
          {session.notes ? (
            <p className="text-sm text-zinc-600">{session.notes}</p>
          ) : null}
          {session.insights.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Insights
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                {session.insights.join(", ")}
              </p>
            </div>
          ) : null}
          {session.goalsForNext.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Goals for next
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                {session.goalsForNext.join(", ")}
              </p>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
