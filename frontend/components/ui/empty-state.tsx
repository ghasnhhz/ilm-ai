import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Designed empty state. Replaces hand-rolled dashed-border empty blocks in
 * gaps/plan/material-list.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-hairline bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-fg">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
