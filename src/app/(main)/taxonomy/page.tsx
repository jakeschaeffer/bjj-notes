"use client";

import { useState } from "react";

import {
  getChildPositions,
  positions,
  positionsById,
  techniqueSearch,
  techniques,
} from "@/lib/taxonomy";

function PositionTree({ parentId, depth }: { parentId: string | null; depth: number }) {
  const children = getChildPositions(parentId);

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {children.map((position) => (
        <div key={position.id} style={{ paddingLeft: depth * 16 }}>
          <div className="text-sm font-semibold text-zinc-700">
            {position.name}
          </div>
          <PositionTree parentId={position.id} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export default function TaxonomyPage() {
  const [query, setQuery] = useState("");
  const results = query.trim()
    ? techniqueSearch.search(query.trim()).map((result) => result.item)
    : [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          Taxonomy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Taxonomy reference</h1>
        <p className="text-sm text-zinc-600">
          Quick view into position hierarchy and technique search.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Positions
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {positions.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Techniques
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {techniques.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Root positions
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {getChildPositions(null).length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Position tree</h2>
        <div className="mt-4">
          <PositionTree parentId={null} depth={0} />
        </div>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Technique search</h2>
        <label className="mt-4 block space-y-2 text-sm font-medium text-zinc-700">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: kimura, sweep, guard"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        {query.trim().length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Type to search techniques.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-zinc-500">No matches found.</p>
            ) : (
              results.map((technique) => (
                <div
                  key={technique.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                >
                  <div className="text-sm font-semibold text-zinc-800">
                    {technique.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    From {positionsById.get(technique.positionFromId)?.name ?? "Unknown"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
