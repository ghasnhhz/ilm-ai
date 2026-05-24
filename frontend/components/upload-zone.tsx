"use client";

import { useRef, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import type { Collection, Material } from "@/types/api";

const ACCEPT = ".pdf,.docx,.txt";

export function UploadZone({
  token,
  collections,
  onUploaded,
}: {
  token: string | undefined;
  collections: Collection[];
  onUploaded: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [collectionId, setCollectionId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function report(material: Material) {
    if (material.status === "failed") {
      setError(`"${material.title}" failed: ${material.error ?? "unknown error"}`);
    } else {
      setMsg(`Added "${material.title}" (${material.chunk_count} chunks)`);
    }
  }

  async function uploadFile(file: File) {
    if (!token) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (collectionId) fd.append("collection_id", collectionId);
      const material = await apiFetch<Material>("/materials/upload", {
        token,
        method: "POST",
        body: fd,
      });
      report(material);
      await onUploaded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed");
    }
    setBusy(false);
  }

  async function submitPaste() {
    if (!token || !title.trim() || !text.trim()) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const material = await apiFetch<Material>("/materials/paste", {
        token,
        method: "POST",
        body: { title: title.trim(), text, collection_id: collectionId || null },
      });
      report(material);
      setTitle("");
      setText("");
      await onUploaded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save text");
    }
    setBusy(false);
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 p-5">
      <div className="flex gap-2">
        <TabButton active={tab === "file"} onClick={() => setTab("file")}>
          Upload file
        </TabButton>
        <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
          Paste text
        </TabButton>
      </div>

      <label className="mt-4 block text-sm text-slate-600">
        Collection
        <select
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
        >
          <option value="">Uncategorized</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {tab === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void uploadFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center ${
            dragging ? "border-brand bg-brand/5" : "border-slate-300"
          }`}
        >
          <p className="text-sm font-medium">
            {busy ? "Uploading…" : "Drag & drop, or click to choose"}
          </p>
          <p className="mt-1 text-xs text-slate-400">PDF, DOCX or TXT</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            rows={6}
            placeholder="Paste your notes or text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={submitPaste}
            disabled={busy || !title.trim() || !text.trim()}
            className="self-start rounded-lg bg-brand px-4 py-2 font-semibold text-brand-fg disabled:opacity-60"
          >
            {busy ? "Saving…" : "Add text"}
          </button>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active ? "bg-brand text-brand-fg" : "text-slate-500 hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}
