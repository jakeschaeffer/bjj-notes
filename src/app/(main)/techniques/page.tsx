"use client";

import { useMemo, useState } from "react";

import {
  getTechniquesByPosition,
  positionsById,
  positionsInTreeOrder,
  techniqueSearch,
  techniques,
} from "@/lib/taxonomy";

const positionOptions = positionsInTreeOrder;

export default function TechniquesPage() {
  const [query, setQuery] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<string | "">("");

  const results = useMemo(() => {
    if (query.trim().length > 0) {
      return techniqueSearch.search(query.trim()).map((result) => result.item);
    }

    if (selectedPosition) {
      return getTechniquesByPosition(selectedPosition);
    }

    return techniques;
  }, [query, selectedPosition]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          Techniques
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Technique library</h1>
        <p className="text-sm text-zinc-600">
          Search by name or filter by position.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: kimura, sweep, guard"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Filter by position
            <select
              value={selectedPosition}
              onChange={(event) => setSelectedPosition(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">All positions</option>
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
        </div>
        <div className="text-sm text-zinc-500">
          Showing {results.length} technique{results.length === 1 ? "" : "s"}.
        </div>
      </section>

      <section className="grid gap-3">
        {results.map((technique) => {
          const positionName = positionsById.get(technique.positionFromId)?.name;
          return (
            <div
              key={technique.id}
              className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{technique.name}</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {technique.category.replace(/-/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                From {positionName ?? "Unknown position"}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
