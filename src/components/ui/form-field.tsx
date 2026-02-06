"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const labelStyles = "block space-y-2 text-sm font-medium text-[var(--muted-strong)]";
const inputStyles =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--line-strong)] focus:ring-offset-1";

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
