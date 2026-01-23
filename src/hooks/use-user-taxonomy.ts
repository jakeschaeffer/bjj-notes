"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { createId, slugify } from "@/lib/utils";
import type {
  PartnerName,
  Perspective,
  UserPositionNote,
  UserTechniqueNote,
} from "@/lib/types";
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
  partners: [],
  techniqueNotes: [],
  positionNotes: [],
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

  const recordPartnerNames = useCallback((names: string[], timestamp: string) => {
    if (names.length === 0) {
      return;
    }

    updateUserTaxonomy((prev) => {
      const updatedPartners: PartnerName[] = [...prev.partners];

      for (const rawName of names) {
        const name = rawName.trim();
        if (!name) {
          continue;
        }

        const normalized = name.toLowerCase();
        const existing = updatedPartners.find(
          (item) => item.name.toLowerCase() === normalized,
        );

        if (existing) {
          existing.roundCount += 1;
          existing.lastUsedAt = timestamp;
        } else {
          updatedPartners.push({
            id: createId(),
            name,
            roundCount: 1,
            lastUsedAt: timestamp,
          });
        }
      }

      return {
        ...prev,
        partners: updatedPartners,
      };
    });
  }, []);

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

  const partnerSuggestions = useMemo(() => {
    return [...state.partners]
      .sort((a, b) => {
        if (b.roundCount === a.roundCount) {
          return b.lastUsedAt.localeCompare(a.lastUsedAt);
        }
        return b.roundCount - a.roundCount;
      })
      .map((item) => item.name);
  }, [state.partners]);

  const techniqueNotesById = useMemo(() => {
    const map = new Map<string, UserTechniqueNote>();
    for (const note of state.techniqueNotes) {
      map.set(note.techniqueId, note);
    }
    return map;
  }, [state.techniqueNotes]);

  const positionNotesById = useMemo(() => {
    const map = new Map<string, UserPositionNote>();
    for (const note of state.positionNotes) {
      map.set(note.positionId, note);
    }
    return map;
  }, [state.positionNotes]);

  const updateTechniqueNote = useCallback((techniqueId: string, notes: string) => {
    const trimmed = notes.trim();
    const now = new Date().toISOString();

    updateUserTaxonomy((prev) => {
      const nextNotes = prev.techniqueNotes.filter(
        (note) => note.techniqueId !== techniqueId,
      );

      if (!trimmed) {
        return {
          ...prev,
          techniqueNotes: nextNotes,
        };
      }

      const existing = prev.techniqueNotes.find(
        (note) => note.techniqueId === techniqueId,
      );

      nextNotes.push({
        id: existing?.id ?? createId(),
        techniqueId,
        notes: trimmed,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });

      return {
        ...prev,
        techniqueNotes: nextNotes,
      };
    });
  }, []);

  const updatePositionNote = useCallback((positionId: string, notes: string) => {
    const trimmed = notes.trim();
    const now = new Date().toISOString();

    updateUserTaxonomy((prev) => {
      const nextNotes = prev.positionNotes.filter(
        (note) => note.positionId !== positionId,
      );

      if (!trimmed) {
        return {
          ...prev,
          positionNotes: nextNotes,
        };
      }

      const existing = prev.positionNotes.find(
        (note) => note.positionId === positionId,
      );

      nextNotes.push({
        id: existing?.id ?? createId(),
        positionId,
        notes: trimmed,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });

      return {
        ...prev,
        positionNotes: nextNotes,
      };
    });
  }, []);

  return {
    positions,
    techniques,
    index,
    tags: state.tags,
    tagSuggestions,
    progress: state.progress,
    partners: state.partners,
    partnerSuggestions,
    techniqueNotes: state.techniqueNotes,
    positionNotes: state.positionNotes,
    techniqueNotesById,
    positionNotesById,
    addCustomPosition,
    addCustomTechnique,
    recordTagUsage,
    recordTechniqueProgress,
    recordPartnerNames,
    updateTechniqueNote,
    updatePositionNote,
  };
}
