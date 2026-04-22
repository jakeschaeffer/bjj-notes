import Fuse from "fuse.js";

import { systemIndex } from "@/lib/taxonomy";
import type { ID, Position, Technique } from "@/lib/types";

const positionFuse = new Fuse(systemIndex.positions, {
  keys: [
    { name: "name", weight: 1 },
    { name: "slug", weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
});

export function suggestPositions(query: string, limit = 6): Position[] {
  const q = query.trim();
  if (!q) {
    return systemIndex.positions.slice(0, limit);
  }
  return positionFuse
    .search(q)
    .slice(0, limit)
    .map((r) => r.item);
}

export function suggestTechniques(
  query: string,
  positionId: ID | null,
  limit = 6,
): Technique[] {
  const base = positionId
    ? systemIndex.getTechniquesForPositionAndParents(positionId)
    : systemIndex.techniques;
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
