"use client";

import { useState } from "react";

import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import {
  TaxonomyCard,
  ClickableTaxonomy,
} from "@/components/taxonomy/taxonomy-card";

function PositionTree({
  parentId,
  depth,
  getChildren,
  onPositionClick,
}: {
  parentId: string | null;
  depth: number;
  getChildren: (parentId: string | null) => { id: string; name: string }[];
  onPositionClick: (id: string) => void;
}) {
  const children = getChildren(parentId);

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {children.map((position) => (
        <div key={position.id} style={{ paddingLeft: depth * 16 }}>
          <button
            type="button"
            onClick={() => onPositionClick(position.id)}
            className="text-sm font-semibold text-zinc-700 hover:text-amber-600 hover:underline"
          >
            {position.name}
          </button>
          <PositionTree
            parentId={position.id}
            depth={depth + 1}
            getChildren={getChildren}
            onPositionClick={onPositionClick}
          />
        </div>
      ))}
    </div>
  );
}

export default function TaxonomyPage() {
  const [query, setQuery] = useState("");
  const { index } = useUserTaxonomy();
  const results = query.trim()
    ? index.techniqueSearch.search(query.trim()).map((result) => result.item)
    : [];

  // Taxonomy card state
  const [taxonomyCard, setTaxonomyCard] = useState<{
    type: "position" | "technique";
    id: string;
  } | null>(null);

  function openTaxonomyCard(type: "position" | "technique", id: string) {
    setTaxonomyCard({ type, id });
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          Taxonomy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Taxonomy reference</h1>
        <p className="text-sm text-zinc-600">
          Click any position or technique to view details.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Positions
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {index.positions.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Techniques
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {index.techniques.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Root positions
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {index.rootPositions.length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Position tree</h2>
        <div className="mt-4">
          <PositionTree
            parentId={null}
            depth={0}
            getChildren={index.getChildren}
            onPositionClick={(id) => openTaxonomyCard("position", id)}
          />
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
              results.map((technique) => {
                const fromPosition = index.positionsById.get(technique.positionFromId);
                return (
                  <div
                    key={technique.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => openTaxonomyCard("technique", technique.id)}
                      className="text-sm font-semibold text-zinc-800 hover:text-amber-600 hover:underline"
                    >
                      {technique.name}
                    </button>
                    <div className="text-xs text-zinc-500">
                      From{" "}
                      {fromPosition ? (
                        <ClickableTaxonomy
                          type="position"
                          id={fromPosition.id}
                          name={fromPosition.name}
                          onClick={openTaxonomyCard}
                        />
                      ) : (
                        "Unknown"
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Taxonomy Card Modal */}
      <TaxonomyCard
        type={taxonomyCard?.type ?? "position"}
        id={taxonomyCard?.id ?? null}
        open={Boolean(taxonomyCard)}
        onClose={() => setTaxonomyCard(null)}
        index={index}
        onNavigate={(type, id) => setTaxonomyCard({ type, id })}
      />
    </div>
  );
}
