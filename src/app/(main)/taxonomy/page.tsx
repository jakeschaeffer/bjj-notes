"use client";

import { useMemo, useState } from "react";

import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";
import {
  TaxonomyCard,
  ClickableTaxonomy,
} from "@/components/taxonomy/taxonomy-card";
import type { Position, Technique } from "@/lib/types";

type TaxIndex = ReturnType<typeof useUserTaxonomy>["index"];

const PERSPECTIVES: Array<{
  key: "top" | "neutral" | "bottom";
  label: string;
}> = [
  { key: "top", label: "Top / Offensive" },
  { key: "neutral", label: "Neutral" },
  { key: "bottom", label: "Bottom / Defensive" },
];

function PositionCard({
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
    <div className={`pos-card ${depth > 0 ? "pos-card-nested" : ""}`}>
      <div className="pos-card-head">
        <span className="pos-pill">{position.name}</span>
        {subtreeTechCount > 0 && (
          <span className="tech-count">
            {subtreeTechCount} tech
          </span>
        )}
        <button
          type="button"
          className="pos-info"
          onClick={(e) => {
            e.stopPropagation();
            onPositionClick(position.id);
          }}
          aria-label="Position details"
        >
          ⓘ
        </button>
        {hasChildren ? (
          <button
            type="button"
            className={`pos-chevron ${expanded ? "is-open" : ""}`}
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            ▸
          </button>
        ) : (
          <span className="pos-chevron-spacer" />
        )}
      </div>

      {expanded && (
        <div className="pos-card-body">
          {directTechCount > 0 && (
            <div className="tech-chips">
              {techniques.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="tech-chip"
                  onClick={() => onTechniqueClick(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {hasChildren && (
            <div className="child-stack">
              {childPositions.map((child) => {
                const grandchildren = index.getChildren(child.id);
                const childTechniques = index.getTechniquesByPosition(child.id);
                return (
                  <PositionCard
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
    ? index.techniqueSearch.search(query.trim()).map((r) => r.item)
    : [];

  const [taxonomyCard, setTaxonomyCard] = useState<{
    type: "position" | "technique";
    id: string;
  } | null>(null);

  function openTaxonomyCard(type: "position" | "technique", id: string) {
    setTaxonomyCard({ type, id });
  }

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
    <>
      <style>{css}</style>
      <div className="v2tax-root">
        <div className="v2tax-shell">
          <div className="top">
            <div>
              <div className="d">Taxonomy.</div>
              <div className="sub">
                {index.positions.length} positions ·{" "}
                {index.techniques.length} techniques
              </div>
            </div>
          </div>

          <div className="v2tax-totals">
            <div className="v2tax-cell">
              <div className="k">Positions</div>
              <div className="v">{index.positions.length}</div>
            </div>
            <div className="v2tax-cell">
              <div className="k">Techniques</div>
              <div className="v">{index.techniques.length}</div>
            </div>
            <div className="v2tax-cell">
              <div className="k">Roots</div>
              <div className="v">{index.rootPositions.length}</div>
            </div>
          </div>

          <div className="section-title">Search</div>
          <div className="v2tax-search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="kimura, sweep, guard…"
            />
          </div>
          {query.trim().length > 0 && (
            <div className="v2tax-results">
              {results.length === 0 ? (
                <div className="v2tax-muted">No matches.</div>
              ) : (
                results.map((technique) => {
                  const fromPosition = index.positionsById.get(
                    technique.positionFromId,
                  );
                  return (
                    <div key={technique.id} className="v2tax-result">
                      <button
                        type="button"
                        onClick={() =>
                          openTaxonomyCard("technique", technique.id)
                        }
                        className="v2tax-result-name"
                      >
                        {technique.name}
                      </button>
                      <div className="v2tax-result-sub">
                        from{" "}
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

          {PERSPECTIVES.map(({ key, label }) => {
            const positions = perspectiveGroups[key];
            if (positions.length === 0) return null;
            return (
              <div key={key}>
                <div className="section-title">{label}</div>
                <div className="v2tax-list">
                  {positions.map((position) => {
                    const children = index.getChildren(position.id);
                    const techniques = index.getTechniquesByPosition(
                      position.id,
                    );
                    return (
                      <PositionCard
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
              </div>
            );
          })}
        </div>
      </div>

      <TaxonomyCard
        type={taxonomyCard?.type ?? "position"}
        id={taxonomyCard?.id ?? null}
        open={Boolean(taxonomyCard)}
        onClose={() => setTaxonomyCard(null)}
        index={index}
        onNavigate={(type, id) => setTaxonomyCard({ type, id })}
      />
    </>
  );
}

const css = `
  .v2tax-root {
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
    font-family: var(--font-inter), sans-serif;
    color: var(--ink);
    background: var(--bg);
    min-height: calc(100vh - 64px);
    margin-left: -20px;
    margin-right: -20px;
    margin-top: -24px;
    margin-bottom: -48px;
    padding-bottom: 24px;
    -webkit-font-smoothing: antialiased;
  }
  .v2tax-shell { max-width: 460px; margin: 0 auto; }
  .v2tax-root .top {
    padding: 18px 18px 10px;
  }
  .v2tax-root .top .d {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.03em;
  }
  .v2tax-root .top .sub {
    font-size: 11px;
    opacity: 0.55;
    margin-top: 2px;
  }
  .v2tax-totals {
    margin: 0 14px 6px;
    padding: 12px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid rgba(26, 24, 21, 0.06);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .v2tax-cell {
    background: var(--cream);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .v2tax-cell .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2tax-cell .v {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .section-title {
    padding: 14px 18px 8px;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.55;
    font-weight: 600;
  }
  .v2tax-search {
    margin: 0 14px 8px;
  }
  .v2tax-search input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1.5px solid var(--ink);
    background: #fff;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    color: inherit;
  }
  .v2tax-search input::placeholder {
    color: rgba(26, 24, 21, 0.3);
  }
  .v2tax-results {
    margin: 0 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .v2tax-muted {
    padding: 14px;
    background: #fff;
    border: 1px dashed rgba(26, 24, 21, 0.15);
    border-radius: 10px;
    font-size: 12px;
    color: rgba(26, 24, 21, 0.55);
    text-align: center;
  }
  .v2tax-result {
    padding: 10px 12px;
    background: #fff;
    border: 1px solid rgba(26, 24, 21, 0.06);
    border-radius: 10px;
  }
  .v2tax-result-name {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
    cursor: pointer;
  }
  .v2tax-result-name:hover { color: var(--accent); }
  .v2tax-result-sub {
    font-size: 11px;
    opacity: 0.55;
    margin-top: 2px;
  }
  .v2tax-list {
    margin: 0 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pos-card {
    background: #fff;
    border-radius: 12px;
    border: 1px solid rgba(26, 24, 21, 0.06);
    overflow: hidden;
  }
  .pos-card-nested {
    background: var(--cream);
    border-color: rgba(26, 24, 21, 0.05);
  }
  .pos-card-head {
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pos-pill {
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(26, 24, 21, 0.08);
    font-weight: 600;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .pos-card-nested .pos-pill {
    font-size: 12px;
    background: rgba(26, 24, 21, 0.06);
  }
  .tech-count {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--accent);
    margin-left: auto;
  }
  .pos-info {
    border: 1px solid rgba(26, 24, 21, 0.15);
    background: transparent;
    color: rgba(26, 24, 21, 0.55);
    width: 28px;
    height: 28px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    flex-shrink: 0;
  }
  .pos-info:hover {
    border-color: var(--ink);
    color: var(--ink);
    background: var(--cream);
  }
  .pos-chevron {
    border: none;
    background: transparent;
    color: rgba(26, 24, 21, 0.45);
    width: 28px;
    height: 28px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    flex-shrink: 0;
    transition: transform 0.15s;
  }
  .pos-chevron.is-open { transform: rotate(90deg); }
  .pos-chevron:hover { color: var(--ink); background: rgba(26, 24, 21, 0.05); }
  .pos-chevron-spacer {
    display: inline-block;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }
  .pos-card-body {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .tech-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .tech-chip {
    font-family: inherit;
    font-size: 11.5px;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid rgba(26, 24, 21, 0.1);
    background: var(--paper-yellow, #fff9e4);
    color: #3a2e12;
    cursor: pointer;
    font-weight: 500;
  }
  .tech-chip:hover {
    background: oklch(0.7 0.12 75);
    color: var(--bg);
    border-color: oklch(0.7 0.12 75);
  }
  .child-stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
`;
