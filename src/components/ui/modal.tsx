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
        className="absolute inset-0 bg-black/30"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-t-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_24px_60px_-40px_var(--shadow)] sm:rounded-2xl",
          "max-h-[85vh] overflow-y-auto",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          {title ? (
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {title}
            </h2>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
