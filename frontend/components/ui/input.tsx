"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";

import { cn } from "@/lib/cn";

const controlBase =
  "w-full rounded-md border border-hairline bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-page disabled:opacity-60";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(controlBase, className)} {...rest} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={cn(controlBase, className)} {...rest} />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(controlBase, className)} {...rest}>
      {children}
    </select>
  );
});

/** Password field with a show/hide toggle. */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(function PasswordInput({ className, ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-fg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {show ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});

export function Label({
  className,
  children,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-ink", className)}
      {...rest}
    >
      {children}
    </label>
  );
}

/**
 * Field associates a label + control + optional error/hint, generating an id so
 * `htmlFor`/`aria-describedby` are wired for accessibility.
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => React.ReactNode;
}) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      {children({
        id,
        "aria-describedby": descId,
        "aria-invalid": error ? true : undefined,
      })}
      {error ? (
        <p id={descId} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-sm text-muted-fg">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
