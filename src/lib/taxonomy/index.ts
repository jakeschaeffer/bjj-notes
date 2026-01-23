import Fuse from "fuse.js";

import positionsData from "@/data/positions.json";
import techniquesData from "@/data/techniques.json";
import type { ID, Position, Technique } from "@/lib/types";

export const systemPositions = positionsData.positions as Position[];
export const systemTechniques = techniquesData.techniques as Technique[];

export function buildTaxonomyIndex(positions: Position[], techniques: Technique[]) {
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
  const rootPositionsByPerspective = {
    top: rootPositions.filter((position) => position.perspective === "top"),
    bottom: rootPositions.filter((position) => position.perspective === "bottom"),
    neutral: rootPositions.filter((position) => position.perspective === "neutral"),
  };

  const getChildren = (parentId: ID | null) =>
    positionsByParent.get(parentId) ?? [];

  const hasChildren = (positionId: ID) =>
    (positionsByParent.get(positionId)?.length ?? 0) > 0;

  const getBreadcrumb = (positionId: ID) => {
    const path: Position[] = [];
    let current = positionsById.get(positionId) ?? null;
    while (current) {
      path.unshift(current);
      if (!current.parentId) {
        break;
      }
      current = positionsById.get(current.parentId) ?? null;
    }
    return path;
  };

  const getFullPath = (positionId: ID) =>
    getBreadcrumb(positionId)
      .map((position) => position.name)
      .join(" > ");

  const getPositionAncestors = (positionId: ID) => {
    const ancestors: ID[] = [];
    let current = positionsById.get(positionId) ?? null;
    while (current) {
      ancestors.push(current.id);
      if (!current.parentId) {
        break;
      }
      current = positionsById.get(current.parentId) ?? null;
    }
    return ancestors;
  };

  const positionsInTreeOrder: Position[] = [];
  const walk = (parentId: ID | null) => {
    const children = getChildren(parentId);
    for (const child of children) {
      positionsInTreeOrder.push(child);
      walk(child.id);
    }
  };
  walk(null);

  const techniquesByPosition = new Map<ID, Technique[]>();
  const techniquesById = new Map<ID, Technique>();
  for (const technique of techniques) {
    techniquesById.set(technique.id, technique);
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

  const techniquesByName = [...techniques].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const getTechniquesByPosition = (positionId: ID) =>
    techniquesByPosition.get(positionId) ?? [];

  const getTechniquesForPositionAndParents = (positionId: ID) => {
    const ancestors = getPositionAncestors(positionId);
    const seen = new Set<ID>();
    const list: Technique[] = [];

    for (const ancestorId of ancestors) {
      const bucket = techniquesByPosition.get(ancestorId) ?? [];
      for (const technique of bucket) {
        if (seen.has(technique.id)) {
          continue;
        }
        seen.add(technique.id);
        list.push(technique);
      }
    }

    return list;
  };

  const techniqueSearch = new Fuse(techniques, {
    keys: ["name", "aliases"],
    threshold: 0.3,
    includeScore: true,
  });

  return {
    positions,
    techniques,
    techniquesById,
    positionsById,
    positionsByParent,
    rootPositions,
    rootPositionsByPerspective,
    positionsInTreeOrder,
    techniquesByPosition,
    techniquesByName,
    techniqueSearch,
    getChildren,
    hasChildren,
    getBreadcrumb,
    getFullPath,
    getPositionAncestors,
    getTechniquesByPosition,
    getTechniquesForPositionAndParents,
  };
}

export const systemIndex = buildTaxonomyIndex(systemPositions, systemTechniques);
