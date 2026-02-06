"use client";

import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type TagVariant = "amber" | "zinc" | "status";

type TagProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  variant?: TagVariant;
  children: ReactNode;
  onRemove?: () => void;
};

const variantStyles: Record<TagVariant, string> = {
  amber:
    "border border-[rgba(182,255,59,0.45)] bg-[rgba(182,255,59,0.14)] text-[var(--gg-signal-2)]",
  zinc:
    "border border-[var(--gg-border)] bg-[var(--gg-surface-2)] text-[var(--gg-text-muted)]",
  status:
    "bg-[rgba(46,242,196,0.2)] text-[var(--gg-signal)]",
};

export function Tag({
  variant = "amber",
  children,
  onRemove,
  className,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-current opacity-60 transition hover:opacity-100 focus:outline-none"
          aria-label="Remove"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
