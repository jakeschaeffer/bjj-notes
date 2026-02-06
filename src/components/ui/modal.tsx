"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-t-2xl border border-[var(--gg-border)] bg-[var(--gg-surface-1)] p-5 text-[var(--gg-text)] shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:rounded-2xl",
          "max-h-[85vh] overflow-y-auto",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--gg-border)] px-3 py-1 text-xs font-semibold text-[var(--gg-text-muted)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-text)]"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
