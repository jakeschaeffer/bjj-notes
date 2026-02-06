"use client";

import { HTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type CardVariant = "section" | "nested" | "dropdown";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  as?: "section" | "div";
};

const variantStyles: Record<CardVariant, string> = {
  section:
    "relative overflow-hidden rounded-2xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.3)]",
  nested:
    "relative overflow-hidden rounded-2xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)] p-5 shadow-[0_16px_32px_rgba(0,0,0,0.25)]",
  dropdown:
    "relative rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-1)] shadow-[0_10px_20px_rgba(0,0,0,0.25)]",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "section", as = "div", className, children, ...props },
  ref,
) {
  const Component = as;
  return (
    <Component
      ref={ref}
      className={cn(variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
});
