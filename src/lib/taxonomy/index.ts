import Fuse from "fuse.js";

import positionsData from "@/data/positions.json";
import techniquesData from "@/data/techniques.json";
import type { ID, Position, Technique } from "@/lib/types";

const positions = positionsData.positions as Position[];
const techniques = techniquesData.techniques as Technique[];

function buildPositionsInTreeOrder() {
  const ordered: Position[] = [];

  function walk(parentId: ID | null) {
    const children = getChildPositions(parentId);
    for (const child of children) {
      ordered.push(child);
      walk(child.id);
    }
  }

  walk(null);
  return ordered;
}

const positionsById = new Map<ID, Position>();
const positionsByParent = new Map<ID | null, Position[]>();

for (const position of positions) {
  positionsById.set(position.id, position);
  const parentId = position.parentId ?? null;
  const siblings = positionsByParent.get(parentId);
  if (siblings) {
    siblings.push(position);
  } else {
    positionsByParent.set(parentId, [position]);
  }
}

for (const siblings of positionsByParent.values()) {
  siblings.sort((a, b) => a.name.localeCompare(b.name));
}

const rootPositions = positionsByParent.get(null) ?? [];
const positionsInTreeOrder = buildPositionsInTreeOrder();

const techniquesByPosition = new Map<ID, Technique[]>();
for (const technique of techniques) {
  const bucket = techniquesByPosition.get(technique.positionFromId);
  if (bucket) {
    bucket.push(technique);
  } else {
    techniquesByPosition.set(technique.positionFromId, [technique]);
  }
}

for (const bucket of techniquesByPosition.values()) {
  bucket.sort((a, b) => a.name.localeCompare(b.name));
}

const techniqueSearch = new Fuse(techniques, {
  keys: ["name", "aliases"],
  threshold: 0.3,
  includeScore: true,
});

export function getChildPositions(parentId: ID | null) {
  return positionsByParent.get(parentId) ?? [];
}

export function getTechniquesByPosition(positionId: ID) {
  return techniquesByPosition.get(positionId) ?? [];
}

export {
  positions,
  positionsInTreeOrder,
  techniques,
  positionsById,
  positionsByParent,
  rootPositions,
  techniquesByPosition,
  techniqueSearch,
};
