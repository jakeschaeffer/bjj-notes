"use client";

import { useMemo, useState } from "react";

import type { Position, Technique, TechniqueCategory } from "@/lib/types";
import { Modal } from "@/components/ui/modal";

const techniqueCategories: TechniqueCategory[] = [
  "submission",
  "sweep",
  "pass",
  "escape",
  "takedown",
  "transition",
  "guard-retention",
  "control",
];

type TechniquePickerProps = {
  value: string | null;
  positionId: string | null;
  onChange: (techniqueId: string) => void;
  recentTechniqueIds: string[];
  index: {
    positionsById: Map<string, Position>;
    techniquesById: Map<string, Technique>;
    techniquesByName: Technique[];
    techniqueSearch: { search: (query: string) => { item: Technique }[] };
    getTechniquesForPositionAndParents: (positionId: string) => Technique[];
    positionsInTreeOrder: Position[];
    getFullPath: (positionId: string) => string;
  };
  onAddCustomTechnique: (input: {
    name: string;
    category: TechniqueCategory;
    positionFromId: string;
    positionToId?: string | null;
  }) => Technique | null;
};

export function TechniquePicker({
  value,
  positionId,
  onChange,
  recentTechniqueIds,
  index,
  onAddCustomTechnique,
}: TechniquePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] =
    useState<TechniqueCategory>("transition");
  const [customFromId, setCustomFromId] = useState<string | null>(positionId);
  const [customToId, setCustomToId] = useState<string | null>(null);

  const selectedTechnique = value
    ? index.techniquesById.get(value) ?? null
    : null;

  const label = selectedTechnique?.name ?? "Select technique";

  const recentTechniques = useMemo(() => {
    const items: Technique[] = [];
    for (const id of recentTechniqueIds) {
      const technique = index.techniquesById.get(id);
      if (technique) {
        items.push(technique);
      }
      if (items.length >= 5) {
        break;
      }
    }
    return items;
  }, [recentTechniqueIds, index.techniquesById]);

  const suggestedTechniques = useMemo(() => {
    if (!positionId) {
      return [];
    }
    return index.getTechniquesForPositionAndParents(positionId);
  }, [index, positionId]);

  const positionName = positionId
    ? index.positionsById.get(positionId)?.name ?? null
    : null;

  const searchResults = useMemo(() => {
    if (!search.trim()) {
      return [];
    }
    return index.techniqueSearch.search(search.trim()).map((result) => result.item);
  }, [index, search]);

  function closeModal() {
    setOpen(false);
    setSearch("");
  }

  function handleSelect(techniqueId: string) {
    onChange(techniqueId);
    closeModal();
  }

  function openCustomTechnique() {
    setCustomOpen(true);
    setCustomName("");
    setCustomCategory("transition");
    setCustomFromId(positionId);
    setCustomToId(null);
  }

  function handleCustomSave() {
    if (!customFromId) {
      return;
    }

    const created = onAddCustomTechnique({
      name: customName,
      category: customCategory,
      positionFromId: customFromId,
      positionToId: customToId,
    });

    if (created) {
      onChange(created.id);
      setCustomOpen(false);
      closeModal();
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm disabled:bg-zinc-50"
        disabled={!positionId}
      >
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>
          {positionId ? label : "Select position first"}
        </span>
        <span className="text-xs text-zinc-400">v</span>
      </button>

      <Modal open={open} onClose={closeModal} title="Select technique">
        <div className="space-y-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search techniques"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />

          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((technique) => (
                <button
                  key={technique.id}
                  type="button"
                  onClick={() => handleSelect(technique.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                >
                  <span>{technique.name}</span>
                  <span className="text-xs text-zinc-400">
                    {technique.category.replace(/-/g, " ")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {positionId && suggestedTechniques.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Suggested from {positionName ?? "position"}
                  </p>
                  <div className="space-y-2">
                    {suggestedTechniques.slice(0, 6).map((technique) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() => handleSelect(technique.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                      >
                        <span>{technique.name}</span>
                        <span className="text-xs text-zinc-400">
                          {technique.category.replace(/-/g, " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {recentTechniques.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Recent
                  </p>
                  <div className="space-y-2">
                    {recentTechniques.map((technique) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() => handleSelect(technique.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                      >
                        <span>{technique.name}</span>
                        <span className="text-xs text-zinc-400">
                          {technique.category.replace(/-/g, " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  All techniques
                </p>
                <div className="space-y-2">
                  {index.techniquesByName.map((technique) => (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() => handleSelect(technique.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                    >
                      <span>{technique.name}</span>
                      <span className="text-xs text-zinc-400">
                        {technique.category.replace(/-/g, " ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={openCustomTechnique}
            className="w-full rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600"
          >
            Add custom technique
          </button>
        </div>
      </Modal>

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add custom technique"
      >
        <div className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Name
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Knee shield entry"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Category
            <select
              value={customCategory}
              onChange={(event) =>
                setCustomCategory(event.target.value as TechniqueCategory)
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              {techniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Starting position
            <select
              value={customFromId ?? ""}
              onChange={(event) => setCustomFromId(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Select position</option>
              {index.positionsInTreeOrder.map((position) => (
                <option key={position.id} value={position.id}>
                  {index.getFullPath(position.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Ending position (optional)
            <select
              value={customToId ?? ""}
              onChange={(event) =>
                setCustomToId(event.target.value ? event.target.value : null)
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {index.positionsInTreeOrder.map((position) => (
                <option key={position.id} value={position.id}>
                  {index.getFullPath(position.id)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCustomSave}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Add technique
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
