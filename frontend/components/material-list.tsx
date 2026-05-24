"use client";

import { apiFetch } from "@/lib/api";
import type { Collection, Material } from "@/types/api";

const STATUS_STYLES: Record<Material["status"], string> = {
  ready: "bg-emerald-100 text-emerald-700",
  processing: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

export function MaterialList({
  token,
  materials,
  collections,
  onChange,
}: {
  token: string | undefined;
  materials: Material[];
  collections: Collection[];
  onChange: () => void | Promise<void>;
}) {
  const collectionName = (id: string | null) =>
    id ? collections.find((c) => c.id === id)?.name ?? "Unknown" : "Uncategorized";

  async function remove(m: Material) {
    if (!token) return;
    if (!window.confirm(`Delete "${m.title}"? This removes its chunks.`)) return;
    await apiFetch(`/materials/${m.id}`, { token, method: "DELETE" });
    await onChange();
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold">Your materials</h2>

      {materials.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Nothing yet — upload a file or paste text to get started.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {materials.map((m) => (
            <li key={m.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {m.file_type.toUpperCase()} · {collectionName(m.collection_id)} ·{" "}
                    {m.chunk_count} chunks
                  </p>
                  {m.status === "failed" && m.error && (
                    <p className="mt-1 text-xs text-red-600">{m.error}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status]}`}
                  >
                    {m.status}
                  </span>
                  <button
                    onClick={() => remove(m)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
