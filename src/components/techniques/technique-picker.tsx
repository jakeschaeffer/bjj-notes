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
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-left text-sm"
      >
        <span
          className={
            value ? "text-[var(--foreground)]" : "text-[var(--muted)]"
          }
        >
          {label}
        </span>
        <span className="text-xs text-[var(--muted)]">▾</span>
      </button>

      <Modal open={open} onClose={closeModal} title="Select technique">
        <div className="space-y-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search techniques"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
          />

          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((technique) => (
                <button
                  key={technique.id}
                  type="button"
                  onClick={() => handleSelect(technique.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm"
                >
                  <span>{technique.name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {technique.category.replace(/-/g, " ")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {positionId && suggestedTechniques.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                    Suggested from {positionName ?? "position"}
                  </p>
                  <div className="space-y-2">
                    {suggestedTechniques.slice(0, 6).map((technique) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() => handleSelect(technique.id)}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm"
                      >
                        <span>{technique.name}</span>
                        <span className="text-xs text-[var(--muted)]">
                          {technique.category.replace(/-/g, " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {recentTechniques.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                    Recent
                  </p>
                  <div className="space-y-2">
                    {recentTechniques.map((technique) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() => handleSelect(technique.id)}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm"
                      >
                        <span>{technique.name}</span>
                        <span className="text-xs text-[var(--muted)]">
                          {technique.category.replace(/-/g, " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  All techniques
                </p>
                <div className="space-y-2">
                  {index.techniquesByName.map((technique) => (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() => handleSelect(technique.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm"
                    >
                      <span>{technique.name}</span>
                      <span className="text-xs text-[var(--muted)]">
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
            className="w-full rounded-xl border border-dashed border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--muted)]"
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
          <label className="space-y-2 text-sm font-medium text-[var(--muted-strong)]">
            Name
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
              placeholder="Knee shield entry"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[var(--muted-strong)]">
            Category
            <select
              value={customCategory}
              onChange={(event) =>
                setCustomCategory(event.target.value as TechniqueCategory)
              }
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {techniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[var(--muted-strong)]">
            Starting position
            <select
              value={customFromId ?? ""}
              onChange={(event) => setCustomFromId(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="">Select position</option>
              {index.positionsInTreeOrder.map((position) => (
                <option key={position.id} value={position.id}>
                  {index.getFullPath(position.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[var(--muted-strong)]">
            Ending position (optional)
            <select
              value={customToId ?? ""}
              onChange={(event) =>
                setCustomToId(event.target.value ? event.target.value : null)
              }
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
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
              className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCustomSave}
              className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
            >
              Add technique
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
