"use client";

import { useState } from "react";

import type { Citation } from "@/types/api";

export function SourceCitation({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:border-brand hover:text-brand"
        title="Show source snippet"
      >
        {citation.material_title} #{citation.chunk_index}
      </button>
      {open && (
        <span className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
          {citation.snippet}
          {citation.snippet.length >= 300 ? "…" : ""}
        </span>
      )}
    </span>
  );
}
