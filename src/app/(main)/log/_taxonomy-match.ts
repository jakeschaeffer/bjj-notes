import Fuse from "fuse.js";

import type { buildTaxonomyIndex } from "@/lib/taxonomy";
import type { ID, Position, Technique } from "@/lib/types";

type TaxonomyIndex = ReturnType<typeof buildTaxonomyIndex>;

export function suggestPositions(
  positions: Position[],
  query: string,
  limit = 6,
): Position[] {
  const q = query.trim();
  if (!q) {
    return positions.slice(0, limit);
  }
  const fuse = new Fuse(positions, {
    keys: [
      { name: "name", weight: 1 },
      { name: "slug", weight: 0.5 },
    ],
    threshold: 0.4,
  });
  return fuse
    .search(q)
    .slice(0, limit)
    .map((r) => r.item);
}

export function suggestTechniques(
  index: TaxonomyIndex,
  positionId: ID | null,
  query: string,
  limit = 6,
): Technique[] {
  const base = positionId
    ? index.getTechniquesForPositionAndParents(positionId)
    : index.techniques;
  const q = query.trim();
  if (!q) {
    return base.slice(0, limit);
  }
  const fuse = new Fuse(base, {
    keys: [
      { name: "name", weight: 1 },
      { name: "aliases", weight: 0.9 },
    ],
    threshold: 0.4,
  });
  return fuse
    .search(q)
    .slice(0, limit)
    .map((r) => r.item);
}
