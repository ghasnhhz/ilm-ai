import { cn } from "@/lib/cn";

/** Animated placeholder block. */
export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...rest}
    />
  );
}

/** Page-level loading state. Replaces the literal `Loading…` text. */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex flex-col gap-3 py-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
