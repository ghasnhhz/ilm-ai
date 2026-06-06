"use client";

import { useState } from "react";

import type { Citation } from "@/types/api";

export function SourceCitation({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-xs text-muted-fg transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Show source snippet"
      >
        {citation.material_title} #{citation.chunk_index}
      </button>
      {open && (
        <span className="mt-1 block rounded-md border border-hairline bg-muted p-2 text-xs text-muted-fg">
          {citation.snippet}
          {citation.snippet.length >= 300 ? "…" : ""}
        </span>
      )}
    </span>
  );
}
