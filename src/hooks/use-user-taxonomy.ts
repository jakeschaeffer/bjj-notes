"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { createId, slugify } from "@/lib/utils";
import type { Perspective } from "@/lib/types";
import type { Position, Technique, TechniqueCategory } from "@/lib/types";
import type { TechniqueProgress, UserTag } from "@/lib/types";
import {
  buildTaxonomyIndex,
  systemPositions,
  systemTechniques,
} from "@/lib/taxonomy";
import { normalizeTag } from "@/lib/taxonomy/tags";
import {
  getSnapshot,
  subscribe,
  updateUserTaxonomy,
} from "@/lib/taxonomy/user-store";

const emptyState = {
  positions: [],
  techniques: [],
  tags: [],
  progress: [],
};

export function useUserTaxonomy() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => emptyState);

  const positions = useMemo<Position[]>(
    () => [...systemPositions, ...state.positions],
    [state.positions],
  );

  const techniques = useMemo<Technique[]>(
    () => [...systemTechniques, ...state.techniques],
    [state.techniques],
  );

  const index = useMemo(
    () => buildTaxonomyIndex(positions, techniques),
    [positions, techniques],
  );

  const addCustomPosition = useCallback(
    (input: { name: string; parentId: string | null; perspective?: Perspective }) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        return null;
      }

      const parent = input.parentId
        ? index.positionsById.get(input.parentId)
        : null;
      const slug = slugify(trimmedName);
      const id = `custom:${slug}-${createId().slice(0, 8)}`;
      const perspective = input.perspective ?? parent?.perspective ?? "neutral";
      const path = parent ? [...parent.path, slug] : [slug];

      const position: Position = {
        id,
        name: trimmedName,
        slug,
        parentId: parent ? parent.id : null,
        path,
        perspective,
        giApplicable: true,
        nogiApplicable: true,
        isCustom: true,
      };

      updateUserTaxonomy((prev) => ({
        ...prev,
        positions: [...prev.positions, position],
      }));

      return position;
    },
    [index.positionsById],
  );

  const addCustomTechnique = useCallback(
    (input: {
      name: string;
      category: TechniqueCategory;
      positionFromId: string;
      positionToId?: string | null;
    }) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        return null;
      }

      const fromPosition = index.positionsById.get(input.positionFromId);
      if (!fromPosition) {
        return null;
      }

      const slug = slugify(trimmedName);
      const id = `custom:${slug}-${createId().slice(0, 8)}`;

      const technique: Technique = {
        id,
        name: trimmedName,
        category: input.category,
        positionFromId: fromPosition.id,
        positionToId: input.positionToId ?? null,
        submissionType: null,
        giApplicable: true,
        nogiApplicable: true,
        aliases: [],
        isCustom: true,
      };

      updateUserTaxonomy((prev) => ({
        ...prev,
        techniques: [...prev.techniques, technique],
      }));

      return technique;
    },
    [index.positionsById],
  );

  const recordTagUsage = useCallback((tags: string[], timestamp: string) => {
    if (tags.length === 0) {
      return;
    }

    updateUserTaxonomy((prev) => {
      const updatedTags: UserTag[] = [...prev.tags];

      for (const rawTag of tags) {
        const tag = normalizeTag(rawTag);
        if (!tag) {
          continue;
        }

        const existing = updatedTags.find((item) => item.tag === tag);
        if (existing) {
          existing.usageCount += 1;
          existing.lastUsedAt = timestamp;
        } else {
          updatedTags.push({
            id: createId(),
            tag,
            usageCount: 1,
            createdAt: timestamp,
            lastUsedAt: timestamp,
          });
        }
      }

      return {
        ...prev,
        tags: updatedTags,
      };
    });
  }, []);

  const recordTechniqueProgress = useCallback(
    (techniqueIds: string[], timestamp: string) => {
      if (techniqueIds.length === 0) {
        return;
      }

      updateUserTaxonomy((prev) => {
        const updatedProgress: TechniqueProgress[] = [...prev.progress];

        for (const techniqueId of techniqueIds) {
          const existing = updatedProgress.find(
            (item) => item.techniqueId === techniqueId,
          );

          if (existing) {
            existing.lastDrilledAt = timestamp;
            existing.timesDrilled += 1;
          } else {
            updatedProgress.push({
              id: createId(),
              techniqueId,
              firstSeenAt: timestamp,
              lastDrilledAt: timestamp,
              timesDrilled: 1,
            });
          }
        }

        return {
          ...prev,
          progress: updatedProgress,
        };
      });
    },
    [],
  );

  const tagSuggestions = useMemo(() => {
    return [...state.tags]
      .sort((a, b) => {
        if (b.usageCount === a.usageCount) {
          return b.lastUsedAt.localeCompare(a.lastUsedAt);
        }
        return b.usageCount - a.usageCount;
      })
      .map((item) => item.tag);
  }, [state.tags]);

  return {
    positions,
    techniques,
    index,
    tags: state.tags,
    tagSuggestions,
    progress: state.progress,
    addCustomPosition,
    addCustomTechnique,
    recordTagUsage,
    recordTechniqueProgress,
  };
}
