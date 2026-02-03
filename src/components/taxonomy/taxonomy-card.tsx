"use client";

import type { Position, Technique, Perspective } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Tag } from "@/components/ui/tag";

type TaxonomyIndex = {
  positionsById: Map<string, Position>;
  techniquesById: Map<string, Technique>;
  getChildren: (parentId: string | null) => Position[];
  getTechniquesForPositionAndParents: (positionId: string) => Technique[];
  getBreadcrumb: (positionId: string) => Position[];
  getFullPath: (positionId: string) => string;
};

type TaxonomyCardProps = {
  type: "position" | "technique";
  id: string | null;
  open: boolean;
  onClose: () => void;
  index: TaxonomyIndex;
  onNavigate?: (type: "position" | "technique", id: string) => void;
};

const perspectiveLabels: Record<Perspective, string> = {
  top: "Top position",
  bottom: "Bottom position",
  neutral: "Neutral",
};

const categoryLabels: Record<string, string> = {
  submission: "Submission",
  sweep: "Sweep",
  pass: "Guard pass",
  escape: "Escape",
  takedown: "Takedown",
  transition: "Transition",
  "guard-retention": "Guard retention",
  control: "Control",
};

export function TaxonomyCard({
  type,
  id,
  open,
  onClose,
  index,
  onNavigate,
}: TaxonomyCardProps) {
  if (!id || !open) {
    return null;
  }

  if (type === "position") {
    const position = index.positionsById.get(id);
    if (!position) {
      return null;
    }

    const children = index.getChildren(id);
    const techniques = index.getTechniquesForPositionAndParents(id);
    const breadcrumb = index.getBreadcrumb(id);

    return (
      <Modal open={open} onClose={onClose} title={position.name}>
        <div className="space-y-5">
          {/* Breadcrumb path */}
          {breadcrumb.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
              {breadcrumb.slice(0, -1).map((pos, idx) => (
                <span key={pos.id} className="flex items-center gap-1.5">
                  {onNavigate ? (
                    <button
                      type="button"
                      onClick={() => onNavigate("position", pos.id)}
                      className="text-amber-600 hover:underline"
                    >
                      {pos.name}
                    </button>
                  ) : (
                    <span>{pos.name}</span>
                  )}
                  {idx < breadcrumb.length - 2 && <span>/</span>}
                </span>
              ))}
            </div>
          )}

          {/* Position info */}
          <div className="flex flex-wrap gap-2">
            <Tag variant="category">{perspectiveLabels[position.perspective]}</Tag>
            {position.giApplicable && <Tag>Gi</Tag>}
            {position.nogiApplicable && <Tag>NoGi</Tag>}
            {position.isCustom && <Tag variant="status">Custom</Tag>}
          </div>

          {/* Child positions */}
          {children.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Variations ({children.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onNavigate?.("position", child.id)}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Techniques from this position */}
          {techniques.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Techniques from here ({techniques.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {techniques.slice(0, 12).map((technique) => (
                  <button
                    key={technique.id}
                    type="button"
                    onClick={() => onNavigate?.("technique", technique.id)}
                    className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                  >
                    {technique.name}
                  </button>
                ))}
                {techniques.length > 12 && (
                  <span className="self-center text-xs text-zinc-400">
                    +{techniques.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // Technique card
  const technique = index.techniquesById.get(id);
  if (!technique) {
    return null;
  }

  const fromPosition = index.positionsById.get(technique.positionFromId);
  const toPosition = technique.positionToId
    ? index.positionsById.get(technique.positionToId)
    : null;

  return (
    <Modal open={open} onClose={onClose} title={technique.name}>
      <div className="space-y-5">
        {/* Category and type badges */}
        <div className="flex flex-wrap gap-2">
          <Tag variant="category">{categoryLabels[technique.category] ?? technique.category}</Tag>
          {technique.submissionType && (
            <Tag variant="accent">{technique.submissionType.replace(/-/g, " ")}</Tag>
          )}
          {technique.giApplicable && <Tag>Gi</Tag>}
          {technique.nogiApplicable && <Tag>NoGi</Tag>}
          {technique.isCustom && <Tag variant="status">Custom</Tag>}
        </div>

        {/* Position flow */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Position flow
          </h3>
          <div className="flex items-center gap-2">
            {fromPosition ? (
              <button
                type="button"
                onClick={() => onNavigate?.("position", fromPosition.id)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
              >
                {fromPosition.name}
              </button>
            ) : (
              <span className="text-xs text-zinc-400">Unknown position</span>
            )}
            <span className="text-zinc-400">→</span>
            {toPosition ? (
              <button
                type="button"
                onClick={() => onNavigate?.("position", toPosition.id)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
              >
                {toPosition.name}
              </button>
            ) : (
              <span className="text-xs text-zinc-400">—</span>
            )}
          </div>
        </div>

        {/* Key details */}
        {technique.keyDetails && technique.keyDetails.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Key details
            </h3>
            <div className="flex flex-wrap gap-2">
              {technique.keyDetails.map((detail) => (
                <span
                  key={detail}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600"
                >
                  {detail}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Aliases */}
        {technique.aliases && technique.aliases.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Also known as
            </h3>
            <p className="text-sm text-zinc-600">{technique.aliases.join(", ")}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Clickable text component for taxonomy items
type ClickableTaxonomyProps = {
  type: "position" | "technique";
  id: string;
  name: string;
  onClick: (type: "position" | "technique", id: string) => void;
  className?: string;
};

export function ClickableTaxonomy({
  type,
  id,
  name,
  onClick,
  className = "",
}: ClickableTaxonomyProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(type, id);
      }}
      className={`text-amber-700 underline decoration-amber-200 decoration-dotted underline-offset-2 transition hover:decoration-amber-500 hover:decoration-solid ${className}`}
    >
      {name}
    </button>
  );
}
