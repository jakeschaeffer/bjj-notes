"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

function PositionRow({
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
    <div className={`pos-row ${depth > 0 ? "pos-row-nested" : ""}`}>
      <div className="pos-row-head">
        <button
          type="button"
          className={`pos-toggle ${expanded ? "is-open" : ""}`}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          disabled={!hasChildren}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {hasChildren ? "▸" : ""}
        </button>
        <button
          type="button"
          className="pos-name"
          onClick={() => onPositionClick(position.id)}
        >
          {position.name}
        </button>
        {subtreeTechCount > 0 && (
          <span className="pos-count mono">
            {subtreeTechCount}
          </span>
        )}
      </div>
      {expanded && (
        <div className="pos-row-body">
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
                  <PositionRow
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
  const router = useRouter();
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
      <div className="tax-root">
        <div className="tax-shell">
          <div className="tax-hdr">
            <div>
              <h1>Taxonomy</h1>
              <div className="no mono">Position map · Technique index</div>
            </div>
          </div>

          <section>
            <div className="label">
              <span>Reference</span>
              <span className="num mono">
                {index.positions.length} positions · {index.techniques.length}{" "}
                techniques
              </span>
            </div>
            <div className="tax-totals">
              <div className="t">
                <div className="k">Positions</div>
                <div className="v mono">{index.positions.length}</div>
              </div>
              <div className="t">
                <div className="k">Techniques</div>
                <div className="v mono">{index.techniques.length}</div>
              </div>
              <div className="t">
                <div className="k">Roots</div>
                <div className="v mono">{index.rootPositions.length}</div>
              </div>
            </div>
          </section>

          <section>
            <div className="label">
              <span>Technique search</span>
            </div>
            <input
              className="tax-search mono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="kimura, sweep, guard…"
            />
            {query.trim().length > 0 && (
              <div className="tax-results">
                {results.length === 0 ? (
                  <div className="tax-muted">No matches.</div>
                ) : (
                  results.map((technique) => {
                    const fromPosition = index.positionsById.get(
                      technique.positionFromId,
                    );
                    return (
                      <div key={technique.id} className="tax-result">
                        <button
                          type="button"
                          className="tax-result-name"
                          onClick={() =>
                            router.push(`/techniques?focus=${technique.id}`)
                          }
                        >
                          {technique.name}
                        </button>
                        <div className="tax-result-sub mono">
                          from{" "}
                          {fromPosition ? (
                            <ClickableTaxonomy
                              type="position"
                              id={fromPosition.id}
                              name={fromPosition.name}
                              onClick={openTaxonomyCard}
                            />
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>

          {PERSPECTIVES.map(({ key, label }) => {
            const positions = perspectiveGroups[key];
            if (positions.length === 0) return null;
            return (
              <section key={key}>
                <div className="label">
                  <span>{label}</span>
                  <span className="num mono">
                    {positions.length}{" "}
                    {positions.length === 1 ? "position" : "positions"}
                  </span>
                </div>
                <div className="pos-list">
                  {positions.map((position) => {
                    const children = index.getChildren(position.id);
                    const techniques = index.getTechniquesByPosition(
                      position.id,
                    );
                    return (
                      <PositionRow
                        key={position.id}
                        position={position}
                        childPositions={children}
                        techniques={techniques}
                        index={index}
                        onPositionClick={(id) =>
                          openTaxonomyCard("position", id)
                        }
                        onTechniqueClick={(id) =>
                          router.push(`/techniques?focus=${id}`)
                        }
                        depth={0}
                      />
                    );
                  })}
                </div>
              </section>
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
  .tax-root {
    --bg: #f5f2ed;
    --ink: #1a1815;
    --accent: oklch(0.45 0.12 25);
    --cream: #faf7f1;
    --paper-yellow: #fff9e4;
    font-family: var(--font-inter), sans-serif;
    color: var(--ink);
    background: var(--bg);
    min-height: calc(100vh - 64px);
    margin-left: -20px;
    margin-right: -20px;
    margin-top: -24px;
    margin-bottom: -48px;
    padding-bottom: 24px;
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
  }
  .tax-shell { max-width: 460px; margin: 0 auto; }
  .tax-root .mono { font-family: var(--font-ibm-plex-mono), ui-monospace, monospace; }
  .tax-hdr {
    padding: 22px 20px 14px;
    border-bottom: 1px solid var(--ink);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .tax-hdr h1 {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: 0;
  }
  .tax-hdr .no {
    font-size: 10px;
    letter-spacing: 0.12em;
    opacity: 0.5;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .tax-root section {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
  }
  .tax-root .label {
    font-size: 9.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.55;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .tax-root .label .num { font-variant-numeric: tabular-nums; }
  .tax-totals {
    display: flex;
    gap: 28px;
    padding-top: 6px;
    border-top: 1px solid var(--ink);
  }
  .tax-totals .t { display: flex; flex-direction: column; gap: 2px; }
  .tax-totals .k {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .tax-totals .v {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .tax-search {
    width: 100%;
    border: 1px solid rgba(26, 24, 21, 0.3);
    background: #fff;
    padding: 10px 12px;
    font-family: var(--font-ibm-plex-mono), monospace;
    font-size: 13px;
    outline: none;
    color: inherit;
  }
  .tax-search:focus { border-color: var(--ink); }
  .tax-search::placeholder { color: rgba(26, 24, 21, 0.35); font-style: italic; }
  .tax-results {
    margin-top: 10px;
    border-top: 1px solid var(--ink);
  }
  .tax-muted {
    padding: 12px 0;
    font-size: 12px;
    color: rgba(26, 24, 21, 0.5);
    font-style: italic;
  }
  .tax-result {
    padding: 10px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .tax-result:first-child { border-top: none; }
  .tax-result-name {
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
  .tax-result-name:hover { color: var(--accent); text-decoration: underline; }
  .tax-result-sub {
    font-size: 11px;
    opacity: 0.55;
    margin-top: 2px;
  }
  .pos-list { border-top: 1px solid var(--ink); }
  .pos-row {
    border-top: 1px solid rgba(26, 24, 21, 0.08);
  }
  .pos-row:first-child { border-top: none; }
  .pos-row-nested {
    border-top: 1px dotted rgba(26, 24, 21, 0.12);
    background: var(--cream);
  }
  .pos-row-head {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
  }
  .pos-row-nested .pos-row-head { padding: 8px 10px; }
  .pos-toggle {
    border: none;
    background: transparent;
    color: rgba(26, 24, 21, 0.45);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    font-family: inherit;
    transition: transform 0.15s;
  }
  .pos-toggle.is-open { transform: rotate(90deg); }
  .pos-toggle:disabled { opacity: 0; cursor: default; }
  .pos-toggle:hover:not(:disabled) { color: var(--ink); }
  .pos-name {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
    cursor: pointer;
    text-align: left;
  }
  .pos-name:hover { color: var(--accent); }
  .pos-row-nested .pos-name { font-size: 12px; font-weight: 500; }
  .pos-count {
    font-size: 11px;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
    padding-left: 6px;
    letter-spacing: 0.04em;
  }
  .pos-row-body {
    padding: 2px 0 10px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pos-row-nested .pos-row-body { padding: 0 10px 10px 20px; }
  .tech-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .tech-chip {
    font-family: inherit;
    font-size: 11.5px;
    padding: 4px 9px;
    border: 1px solid rgba(26, 24, 21, 0.2);
    background: var(--paper-yellow);
    color: #3a2e12;
    cursor: pointer;
    border-radius: 0;
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
  }
`;
