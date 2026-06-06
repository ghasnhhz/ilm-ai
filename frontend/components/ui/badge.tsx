import { cn } from "@/lib/cn";

type Variant = "neutral" | "success" | "warn" | "danger" | "info";

const variants: Record<Variant, string> = {
  neutral: "bg-muted text-muted-fg",
  success: "bg-success/10 text-success",
  warn: "bg-warn/10 text-warn",
  danger: "bg-danger/10 text-danger",
  info: "bg-primary/10 text-primary",
};

/** Status pill. Replaces the ad-hoc `rounded-full bg-…-100 text-…-700` chips. */
export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
