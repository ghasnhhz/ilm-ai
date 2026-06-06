"use client";

import { useRef, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import type { Collection, Material } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

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
  const { toast } = useToast();
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [collectionId, setCollectionId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function report(material: Material) {
    if (material.status === "failed") {
      toast(
        `"${material.title}" failed: ${material.error ?? "unknown error"}`,
        "error",
      );
    } else {
      toast(`Added "${material.title}" (${material.chunk_count} chunks)`, "success");
    }
  }

  async function uploadFile(file: File) {
    if (!token) return;
    setBusy(true);
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
      toast(e instanceof ApiError ? e.message : "Upload failed", "error");
    }
    setBusy(false);
  }

  async function submitPaste() {
    if (!token || !title.trim() || !text.trim()) return;
    setBusy(true);
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
      toast(e instanceof ApiError ? e.message : "Could not save text", "error");
    }
    setBusy(false);
  }

  return (
    <Card>
      <div className="flex gap-2">
        <TabButton active={tab === "file"} onClick={() => setTab("file")}>
          Upload file
        </TabButton>
        <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
          Paste text
        </TabButton>
      </div>

      <div className="mt-4">
        <Label htmlFor="upload-collection">Collection</Label>
        <Select
          id="upload-collection"
          className="mt-1"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
        >
          <option value="">Uncategorized</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

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
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-hairline",
          )}
        >
          <p className="text-sm font-medium text-ink">
            {busy ? "Uploading…" : "Drag & drop, or click to choose"}
          </p>
          <p className="mt-1 text-xs text-muted-fg">PDF, DOCX or TXT</p>
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
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            rows={6}
            placeholder="Paste your notes or text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            className="self-start"
            onClick={submitPaste}
            loading={busy}
            disabled={!title.trim() || !text.trim()}
          >
            Add text
          </Button>
        </div>
      )}
    </Card>
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
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active ? "bg-primary text-primary-fg" : "text-muted-fg hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
