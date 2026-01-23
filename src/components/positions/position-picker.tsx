"use client";

import { useMemo, useState } from "react";

import type { Perspective } from "@/lib/types";
import type { Position } from "@/lib/types";
import { Modal } from "@/components/ui/modal";

const perspectives: Perspective[] = ["top", "bottom", "neutral"];

const perspectiveLabels: Record<Perspective, string> = {
  top: "Top positions",
  bottom: "Bottom positions",
  neutral: "Neutral",
};

type PositionPickerProps = {
  value: string | null;
  onChange: (positionId: string) => void;
  recentPositionIds: string[];
  index: {
    positionsById: Map<string, Position>;
    rootPositionsByPerspective: Record<Perspective, Position[]>;
    positionsInTreeOrder: Position[];
    getChildren: (parentId: string | null) => Position[];
    hasChildren: (positionId: string) => boolean;
    getBreadcrumb: (positionId: string) => Position[];
    getFullPath: (positionId: string) => string;
  };
  onAddCustomPosition: (input: {
    name: string;
    parentId: string | null;
    perspective?: Perspective;
  }) => Position | null;
};

export function PositionPicker({
  value,
  onChange,
  recentPositionIds,
  index,
  onAddCustomPosition,
}: PositionPickerProps) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customParentId, setCustomParentId] = useState<string | null>(null);
  const [customPerspective, setCustomPerspective] = useState<Perspective>("neutral");

  const currentParentId = path[path.length - 1] ?? null;
  const searchQuery = search.trim().toLowerCase();
  const isSearching = searchQuery.length > 0;
  const currentParent = currentParentId
    ? index.positionsById.get(currentParentId) ?? null
    : null;

  const positionLabel = value
    ? index.getFullPath(value)
    : "Select position";

  const recentPositions = useMemo(() => {
    const items: Position[] = [];
    for (const id of recentPositionIds) {
      const position = index.positionsById.get(id);
      if (position) {
        items.push(position);
      }
      if (items.length >= 5) {
        break;
      }
    }
    return items;
  }, [recentPositionIds, index.positionsById]);

  const children = useMemo(() => {
    return index.getChildren(currentParentId);
  }, [currentParentId, index]);

  const searchResults = useMemo(() => {
    if (!isSearching) {
      return [];
    }

    return index.positionsInTreeOrder.filter((position) => {
      const name = position.name.toLowerCase();
      if (name.includes(searchQuery)) {
        return true;
      }
      const pathLabel = index.getFullPath(position.id).toLowerCase();
      return pathLabel.includes(searchQuery);
    });
  }, [index, isSearching, searchQuery]);

  const breadcrumb = isSearching
    ? "Search results"
    : currentParentId
      ? index.getBreadcrumb(currentParentId).map((item) => item.name).join(" / ")
      : "Select position";

  function closeModal() {
    setOpen(false);
    setSearch("");
    setPath([]);
  }

  function handleSelect(positionId: string) {
    onChange(positionId);
    closeModal();
  }

  function drillInto(positionId: string) {
    setPath(index.getBreadcrumb(positionId).map((item) => item.id));
    setSearch("");
  }

  function openCustomPosition() {
    setCustomOpen(true);
    setCustomName("");
    setCustomParentId(currentParentId);
    setCustomPerspective(currentParent?.perspective ?? "neutral");
  }

  function handleCustomSave() {
    const created = onAddCustomPosition({
      name: customName,
      parentId: customParentId,
      perspective: customPerspective,
    });

    if (created) {
      onChange(created.id);
      setCustomOpen(false);
      closeModal();
    }
  }

  const PositionRow = ({
    position,
    onDrill,
    showPath,
  }: {
    position: Position;
    onDrill?: () => void;
    showPath?: boolean;
  }) => {
    const hasChildren = index.hasChildren(position.id);
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm">
        <button
          type="button"
          onClick={() => handleSelect(position.id)}
          className="flex-1 text-left"
        >
          <span className="block">{position.name}</span>
          {showPath ? (
            <span className="block text-xs text-zinc-400">
              {index.getFullPath(position.id)}
            </span>
          ) : null}
        </button>
        {hasChildren && onDrill ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDrill();
            }}
            className="rounded-full px-2 text-xs text-zinc-400 transition hover:text-zinc-700"
            aria-label={`Browse ${position.name}`}
          >
            &gt;
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm"
      >
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>
          {positionLabel}
        </span>
        <span className="text-xs text-zinc-400">v</span>
      </button>

      <Modal open={open} onClose={closeModal} title={breadcrumb}>
        <div className="space-y-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search positions"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />

          {currentParentId && !isSearching ? (
            <button
              type="button"
              onClick={() => handleSelect(currentParentId)}
              className="w-full rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-left text-sm font-semibold text-amber-900"
            >
              Select {currentParent?.name} (general)
            </button>
          ) : null}

          {!currentParentId && !isSearching && recentPositions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Recent
              </p>
              <div className="space-y-2">
                {recentPositions.map((position) => (
                  <button
                    key={position.id}
                    type="button"
                    onClick={() => handleSelect(position.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm"
                  >
                    <span>{position.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isSearching ? (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-sm text-zinc-500">No positions found.</p>
              ) : (
                searchResults.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    showPath
                    onDrill={
                      index.hasChildren(position.id)
                        ? () => drillInto(position.id)
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          ) : !currentParentId ? (
            <div className="space-y-4">
              {perspectives.map((perspective) => {
                const items = index.rootPositionsByPerspective[perspective];
                if (!items.length) {
                  return null;
                }

                return (
                  <div key={perspective} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                      {perspectiveLabels[perspective]}
                    </p>
                    <div className="space-y-2">
                      {items.map((position) => (
                        <PositionRow
                          key={position.id}
                          position={position}
                          onDrill={
                            index.hasChildren(position.id)
                              ? () => setPath([position.id])
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {children.length === 0 ? (
                <p className="text-sm text-zinc-500">No positions found.</p>
              ) : (
                children.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    onDrill={
                      index.hasChildren(position.id)
                        ? () => setPath([...path, position.id])
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          )}

          {currentParentId && !isSearching ? (
            <button
              type="button"
              onClick={() => setPath(path.slice(0, -1))}
              className="text-xs font-semibold text-zinc-500"
            >
              Back
            </button>
          ) : null}

          <button
            type="button"
            onClick={openCustomPosition}
            className="w-full rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600"
          >
            Add custom position
          </button>
        </div>
      </Modal>

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add custom position"
      >
        <div className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Name
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Octopus guard"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Parent position (optional)
            <select
              value={customParentId ?? ""}
              onChange={(event) =>
                setCustomParentId(event.target.value || null)
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
          <div className="space-y-2 text-sm font-medium text-zinc-700">
            Perspective
            <div className="flex flex-wrap gap-3">
              {perspectives.map((item) => (
                <label key={item} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="perspective"
                    checked={customPerspective === item}
                    onChange={() => setCustomPerspective(item)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm capitalize">{item}</span>
                </label>
              ))}
            </div>
          </div>
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
              Add position
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
