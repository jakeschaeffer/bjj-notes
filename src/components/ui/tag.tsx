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
    "border border-amber-200 bg-amber-50 text-amber-700",
  zinc:
    "border border-zinc-200 bg-zinc-50 text-zinc-600",
  status:
    "bg-amber-100 text-amber-900",
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
