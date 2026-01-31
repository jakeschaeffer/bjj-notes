"use client";

import { HTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type CardVariant = "section" | "nested" | "dropdown";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  as?: "section" | "div";
};

const variantStyles: Record<CardVariant, string> = {
  section: "rounded-2xl border border-amber-100 bg-white p-6 shadow-sm",
  nested: "rounded-2xl border border-amber-100 bg-white p-5 shadow-sm",
  dropdown: "rounded-lg border border-zinc-200 bg-white shadow-sm",
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
