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
    "bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] text-black shadow-[0_12px_28px_rgba(46,242,196,0.25)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)] focus:ring-offset-2 focus:ring-offset-[var(--gg-bg)]",
  secondary:
    "border border-[var(--gg-border)] bg-[var(--gg-surface-2)] text-[var(--gg-text)] hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)] focus:ring-offset-2 focus:ring-offset-[var(--gg-bg)]",
  accent:
    "border border-[var(--gg-signal)]/40 text-[var(--gg-signal)] hover:bg-[rgba(46,242,196,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)] focus:ring-offset-2 focus:ring-offset-[var(--gg-bg)]",
  danger:
    "border border-[rgba(255,91,91,0.4)] text-[var(--gg-danger)] hover:bg-[rgba(255,91,91,0.12)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-danger)] focus:ring-offset-2 focus:ring-offset-[var(--gg-bg)]",
  ghost:
    "text-[var(--gg-text-muted)] hover:text-[var(--gg-text)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)] focus:ring-offset-2 focus:ring-offset-[var(--gg-bg)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em]",
  md: "px-4 py-2 text-sm tracking-[0.08em]",
  lg: "px-6 py-3 text-sm tracking-[0.08em]",
  icon: "h-10 w-10 p-0",
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
          "inline-flex items-center justify-center rounded-lg font-semibold transition",
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
