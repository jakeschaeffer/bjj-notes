"use client";

import { useMemo, useState } from "react";

import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import {
  TaxonomyCard,
  ClickableTaxonomy,
} from "@/components/taxonomy/taxonomy-card";
import type { Position, Technique } from "@/lib/types";

const perspectiveConfig = {
  top: {
    label: "Top / Offensive",
    headerColor: "text-amber-700",
    dot: "bg-amber-400",
  },
  bottom: {
    label: "Bottom / Defensive",
    headerColor: "text-blue-700",
    dot: "bg-blue-400",
  },
  neutral: {
    label: "Neutral",
    headerColor: "text-zinc-600",
    dot: "bg-zinc-400",
  },
} as const;

type TaxIndex = ReturnType<typeof useUserTaxonomy>["index"];

function PositionNode({
  position,
  childPositions,
  techniques,
  index,
  onPositionClick,
  onTechniqueClick,
  depth,
}: {
  position: Position;
  childPositions: Position[];
  techniques: Technique[];
  index: TaxIndex;
  onPositionClick: (id: string) => void;
  onTechniqueClick: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = childPositions.length > 0;
  const directTechCount = techniques.length;

  // Count all techniques in subtree
  const subtreeTechCount = useMemo(() => {
    let count = directTechCount;
    const stack = [...childPositions];
    while (stack.length > 0) {
      const child = stack.pop()!;
      count += index.getTechniquesByPosition(child.id).length;
      const grandchildren = index.getChildren(child.id);
      stack.push(...grandchildren);
    }
    return count;
  }, [childPositions, directTechCount, index]);

  return (
    <div
      className={`rounded-xl border ${
        depth === 0
          ? "border-zinc-200 bg-white shadow-sm"
          : "border-zinc-100 bg-zinc-50/50"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`text-xs text-zinc-400 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </button>
        ) : (
          <span className="w-3" />
        )}
        <button
          type="button"
          onClick={() =>
            hasChildren ? setExpanded(!expanded) : onPositionClick(position.id)
          }
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-zinc-800"
        >
          {position.name}
        </button>
        {subtreeTechCount > 0 && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
            {subtreeTechCount} tech
          </span>
        )}
        <button
          type="button"
          onClick={() => onPositionClick(position.id)}
          className="text-xs text-amber-600 hover:underline"
        >
          Details
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 px-4 pb-4">
          {/* Direct techniques */}
          {directTechCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {techniques.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTechniqueClick(t.id)}
                  className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Child positions */}
          {childPositions.length > 0 && (
            <div className="space-y-2">
              {childPositions.map((child) => {
                const grandchildren = index.getChildren(child.id);
                const childTechniques = index.getTechniquesByPosition(
                  child.id,
                );
                return (
                  <PositionNode
                    key={child.id}
                    position={child}
                    childPositions={grandchildren}
                    techniques={childTechniques}
                    index={index}
                    onPositionClick={onPositionClick}
                    onTechniqueClick={onTechniqueClick}
                    depth={depth + 1}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaxonomyPage() {
  const [query, setQuery] = useState("");
  const { index } = useUserTaxonomy();
  const results = query.trim()
    ? index.techniqueSearch.search(query.trim()).map((result) => result.item)
    : [];

  const [taxonomyCard, setTaxonomyCard] = useState<{
    type: "position" | "technique";
    id: string;
  } | null>(null);

  function openTaxonomyCard(type: "position" | "technique", id: string) {
    setTaxonomyCard({ type, id });
  }

  // Group root positions by perspective
  const perspectiveGroups = useMemo(() => {
    const groups: Record<"top" | "bottom" | "neutral", Position[]> = {
      top: [],
      bottom: [],
      neutral: [],
    };
    for (const pos of index.rootPositions) {
      groups[pos.perspective].push(pos);
    }
    return groups;
  }, [index.rootPositions]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          Taxonomy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Position map</h1>
        <p className="text-sm text-zinc-600">
          BJJ positions grouped by perspective. Click to explore techniques.
        </p>
      </header>

      {/* Stats */}
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

      {/* Technique search */}
      <section className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Technique search</h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search: kimura, sweep, guard..."
          className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
        {query.trim().length > 0 && (
          <div className="mt-4 space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-zinc-500">No matches found.</p>
            ) : (
              results.map((technique) => {
                const fromPosition = index.positionsById.get(
                  technique.positionFromId,
                );
                return (
                  <div
                    key={technique.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openTaxonomyCard("technique", technique.id)
                      }
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

      {/* Perspective-grouped position map */}
      {(["top", "neutral", "bottom"] as const).map((perspective) => {
        const positions = perspectiveGroups[perspective];
        if (positions.length === 0) return null;
        const config = perspectiveConfig[perspective];

        return (
          <section key={perspective} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${config.dot}`}
              />
              <h2 className={`text-lg font-semibold ${config.headerColor}`}>
                {config.label}
              </h2>
              <span className="text-xs text-zinc-400">
                {positions.length} position
                {positions.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {positions.map((position) => {
                const children = index.getChildren(position.id);
                const techniques = index.getTechniquesByPosition(position.id);
                return (
                  <PositionNode
                    key={position.id}
                    position={position}
                    childPositions={children}
                    techniques={techniques}
                    index={index}
                    onPositionClick={(id) =>
                      openTaxonomyCard("position", id)
                    }
                    onTechniqueClick={(id) =>
                      openTaxonomyCard("technique", id)
                    }
                    depth={0}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

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
