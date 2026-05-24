"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Collection } from "@/types/api";

export function CollectionManager({
  token,
  collections,
  onChange,
}: {
  token: string | undefined;
  collections: Collection[];
  onChange: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!token || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/collections", { token, method: "POST", body: { name: name.trim() } });
      setName("");
      await onChange();
    } catch {
      setError("Could not create collection");
    }
    setBusy(false);
  }

  async function rename(c: Collection) {
    if (!token) return;
    const next = window.prompt("Rename collection", c.name);
    if (!next || next.trim() === c.name) return;
    try {
      await apiFetch(`/collections/${c.id}`, {
        token,
        method: "PUT",
        body: { name: next.trim() },
      });
      await onChange();
    } catch {
      setError("Could not rename collection");
    }
  }

  async function remove(c: Collection) {
    if (!token) return;
    if (!window.confirm(`Delete "${c.name}"? Its materials become uncategorized.`)) return;
    try {
      await apiFetch(`/collections/${c.id}`, { token, method: "DELETE" });
      await onChange();
    } catch {
      setError("Could not delete collection");
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold">Collections</h2>
      <p className="mt-1 text-sm text-slate-600">Group your materials by topic.</p>

      <div className="mt-3 flex gap-2">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="New collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <button
          onClick={create}
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 font-semibold text-brand-fg disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {collections.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {collections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <span className="text-sm font-medium">{c.name}</span>
              <span className="flex gap-3 text-xs">
                <button onClick={() => rename(c)} className="text-slate-500 hover:text-brand">
                  Rename
                </button>
                <button onClick={() => remove(c)} className="text-slate-500 hover:text-red-600">
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
