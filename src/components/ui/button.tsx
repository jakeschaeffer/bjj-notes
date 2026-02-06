"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "accent" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--foreground)] text-[var(--background)] hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:ring-offset-2",
  secondary:
    "border border-[var(--line-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--line-strong)] focus:ring-offset-2",
  accent:
    "bg-[var(--accent)] text-white shadow-[0_12px_32px_-18px_var(--glow)] hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2",
  danger:
    "border border-red-200 text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2",
  ghost:
    "text-[var(--muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--line-strong)] focus:ring-offset-2",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", className, disabled, ...props },
    ref,
  ) {
  return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold transition",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);
