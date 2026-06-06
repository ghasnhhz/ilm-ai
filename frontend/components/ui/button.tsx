"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover",
  secondary:
    "border border-primary bg-transparent text-primary hover:bg-primary/5",
  ghost: "bg-transparent text-muted-fg hover:bg-muted hover:text-ink",
  danger: "bg-danger text-white shadow-sm hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function buttonClasses(opts?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}): string {
  const { variant = "primary", size = "md", className } = opts ?? {};
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * The single button primitive. Renders a Next <Link> when `href` is set so
 * link-buttons and action-buttons share one look. Replaces the ~10 copy-pasted
 * `rounded-xl bg-brand …` button styles across the app.
 */
export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(
  { variant = "primary", size = "md", loading, className, children, ...rest },
  ref,
) {
  const classes = buttonClasses({ variant, size, className });
  const spinner = loading ? (
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  ) : null;

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as ButtonAsLink;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...anchorRest}
      >
        {spinner}
        {children}
      </Link>
    );
  }

  const { disabled, ...buttonRest } = rest as ButtonAsButton;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      disabled={disabled || loading}
      {...buttonRest}
    >
      {spinner}
      {children}
    </button>
  );
});
