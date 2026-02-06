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
    "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_-40px_var(--shadow)]",
  nested:
    "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_24px_60px_-40px_var(--shadow)]",
  dropdown:
    "rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_12px_36px_-28px_var(--shadow)]",
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
