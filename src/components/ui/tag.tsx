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
    "border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]",
  zinc:
    "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]",
  status:
    "bg-[var(--accent)] text-white",
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
