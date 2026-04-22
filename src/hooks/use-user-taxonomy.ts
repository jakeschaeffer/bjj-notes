"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/db/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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

type UserTaxonomyState = {
  positions: Position[];
  techniques: Technique[];
  tags: UserTag[];
  progress: TechniqueProgress[];
  partners: PartnerName[];
  techniqueNotes: UserTechniqueNote[];
  positionNotes: UserPositionNote[];
};

const emptyState: UserTaxonomyState = {
  positions: [],
  techniques: [],
  tags: [],
  progress: [],
  partners: [],
  techniqueNotes: [],
  positionNotes: [],
};

export function useUserTaxonomy() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UserTaxonomyState>(emptyState);

  const persistState = useCallback(
    async (next: UserTaxonomyState) => {
      if (!user) {
        return;
      }

      const { error } = await supabase.from("user_taxonomy").upsert({
        user_id: user.id,
        data: next,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to save taxonomy", error.message);
      }
    },
    [user],
  );

  const updateState = useCallback(
    (updater: (prev: UserTaxonomyState) => UserTaxonomyState) => {
      setState((prev) => {
        const next = updater(prev);
        void persistState(next);
        return next;
      });
    },
    [persistState],
  );

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setState(emptyState);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("user_taxonomy")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Failed to load taxonomy", error.message);
        setState(emptyState);
        return;
      }

      const stored = (data?.data as UserTaxonomyState | undefined) ?? emptyState;
      setState({
        ...emptyState,
        ...stored,
        positions: stored.positions ?? [],
        techniques: stored.techniques ?? [],
        tags: stored.tags ?? [],
        progress: stored.progress ?? [],
        partners: stored.partners ?? [],
        techniqueNotes: stored.techniqueNotes ?? [],
        positionNotes: stored.positionNotes ?? [],
      });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

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

      updateState((prev) => ({
        ...prev,
        positions: [...prev.positions, position],
      }));

      return position;
    },
    [index.positionsById, updateState],
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

      updateState((prev) => ({
        ...prev,
        techniques: [...prev.techniques, technique],
      }));

      return technique;
    },
    [index.positionsById, updateState],
  );

  const recordTagUsage = useCallback((tags: string[], timestamp: string) => {
    if (tags.length === 0) {
      return;
    }

    updateState((prev) => {
      const updatedTags: UserTag[] = [...prev.tags];
      const tagIndex = new Map<string, UserTag>();
      for (const item of updatedTags) {
        tagIndex.set(item.tag, item);
      }

      for (const rawTag of tags) {
        const tag = normalizeTag(rawTag);
        if (!tag) {
          continue;
        }

        const existing = tagIndex.get(tag);
        if (existing) {
          existing.usageCount += 1;
          existing.lastUsedAt = timestamp;
        } else {
          const newTag: UserTag = {
            id: createId(),
            tag,
            usageCount: 1,
            createdAt: timestamp,
            lastUsedAt: timestamp,
          };
          updatedTags.push(newTag);
          tagIndex.set(tag, newTag);
        }
      }

      return {
        ...prev,
        tags: updatedTags,
      };
    });
  }, [updateState]);

  const recordTechniqueProgress = useCallback(
    (techniqueIds: string[], timestamp: string) => {
      if (techniqueIds.length === 0) {
        return;
      }

      updateState((prev) => {
        const updatedProgress: TechniqueProgress[] = [...prev.progress];
        const progressIndex = new Map<string, TechniqueProgress>();
        for (const item of updatedProgress) {
          progressIndex.set(item.techniqueId, item);
        }

        for (const techniqueId of techniqueIds) {
          const existing = progressIndex.get(techniqueId);

          if (existing) {
            existing.lastDrilledAt = timestamp;
            existing.timesDrilled += 1;
          } else {
            const newProgress: TechniqueProgress = {
              id: createId(),
              techniqueId,
              firstSeenAt: timestamp,
              lastDrilledAt: timestamp,
              timesDrilled: 1,
            };
            updatedProgress.push(newProgress);
            progressIndex.set(techniqueId, newProgress);
          }
        }

        return {
          ...prev,
          progress: updatedProgress,
        };
      });
    },
    [updateState],
  );

  const recordPartnerNames = useCallback((names: string[], timestamp: string) => {
    if (names.length === 0) {
      return;
    }

    updateState((prev) => {
      const updatedPartners: PartnerName[] = [...prev.partners];
      const partnerIndex = new Map<string, PartnerName>();
      for (const item of updatedPartners) {
        partnerIndex.set(item.name.toLowerCase(), item);
      }

      for (const rawName of names) {
        const name = rawName.trim();
        if (!name) {
          continue;
        }

        const normalized = name.toLowerCase();
        const existing = partnerIndex.get(normalized);

        if (existing) {
          existing.roundCount += 1;
          existing.lastUsedAt = timestamp;
        } else {
          const newPartner: PartnerName = {
            id: createId(),
            name,
            roundCount: 1,
            lastUsedAt: timestamp,
          };
          updatedPartners.push(newPartner);
          partnerIndex.set(normalized, newPartner);
        }
      }

      return {
        ...prev,
        partners: updatedPartners,
      };
    });
  }, [updateState]);

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

    updateState((prev) => {
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
  }, [updateState]);

  const updatePositionNote = useCallback((positionId: string, notes: string) => {
    const trimmed = notes.trim();
    const now = new Date().toISOString();

    updateState((prev) => {
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
  }, [updateState]);

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
