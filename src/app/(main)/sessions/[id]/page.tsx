"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { useLocalSessions } from "@/hooks/use-local-sessions";
import { positionsById, techniques } from "@/lib/taxonomy";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getSessionById, deleteSession } = useLocalSessions();
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

  const techniqueName = (techniqueId: string | null) => {
    if (!techniqueId) {
      return null;
    }
    return techniques.find((item) => item.id === techniqueId)?.name ?? null;
  };

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
          <p>Rounds: {session.sparringRounds}</p>
          <p>Subs: +{session.subsAchieved} / -{session.subsReceived}</p>
        </div>
        {session.sparringNotes ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Sparring notes
            </p>
            <p className="mt-2 text-sm text-zinc-700">{session.sparringNotes}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Techniques</h2>
        {session.techniques.length === 0 ? (
          <p className="text-sm text-zinc-600">No techniques logged.</p>
        ) : (
          <div className="grid gap-3">
            {session.techniques.map((technique) => {
              const name =
                techniqueName(technique.techniqueId) ??
                technique.techniqueNameOverride ??
                "Unlabeled technique";
              const positionBase = technique.positionId
                ? positionsById.get(technique.positionId)?.name
                : null;
              const position = technique.positionNameOverride
                ? positionBase
                  ? `${technique.positionNameOverride} (${positionBase})`
                  : technique.positionNameOverride
                : positionBase;

              return (
                <div
                  key={technique.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-800">{name}</h3>
                    <span className="text-xs font-semibold text-amber-600">
                      Confidence {technique.confidence}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {position ?? "Position not set"}
                  </div>
                  {technique.notes ? (
                    <p className="mt-2 text-sm text-zinc-600">{technique.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

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
