import { cn } from "@/lib/cn";

/**
 * Card surface. Replaces the repeated `rounded-xl border border-slate-200 p-5`.
 */
export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-surface p-5 shadow-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("font-semibold text-ink", className)} {...rest}>
      {children}
    </h2>
  );
}
