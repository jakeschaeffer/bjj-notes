"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const labelStyles =
  "block space-y-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--gg-text-muted)]";
const inputStyles =
  "w-full rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)] placeholder:text-[var(--gg-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gg-signal)] focus:ring-offset-2 focus:ring-offset-[var(--gg-bg)]";

type BaseFieldProps = {
  label: string;
  className?: string;
};

type InputFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    as?: "input";
  };

type TextareaFieldProps = BaseFieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    as: "textarea";
  };

type SelectFieldProps = BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    as: "select";
    children: ReactNode;
  };

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, className, as = "input", ...rest } = props;

  if (as === "textarea") {
    const textareaProps = rest as TextareaHTMLAttributes<HTMLTextAreaElement>;
    return (
      <label className={cn(labelStyles, className)}>
        {label}
        <textarea
          className={cn(inputStyles, "resize-none")}
          rows={3}
          {...textareaProps}
        />
      </label>
    );
  }

  if (as === "select") {
    const { children, ...selectProps } = rest as SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode };
    return (
      <label className={cn(labelStyles, className)}>
        {label}
        <select className={inputStyles} {...selectProps}>
          {children}
        </select>
      </label>
    );
  }

  const inputProps = rest as InputHTMLAttributes<HTMLInputElement>;
  return (
    <label className={cn(labelStyles, className)}>
      {label}
      <input className={inputStyles} {...inputProps} />
    </label>
  );
}
