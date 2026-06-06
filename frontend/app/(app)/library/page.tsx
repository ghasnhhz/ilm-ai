"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { Collection, Material } from "@/types/api";
import { CollectionManager } from "@/components/collection-manager";
import { MaterialList } from "@/components/material-list";
import { UploadZone } from "@/components/upload-zone";

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [collections, setCollections] = useState<Collection[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const loadCollections = useCallback(async () => {
    if (!token) return;
    setCollections(await apiFetch<Collection[]>("/collections", { token }));
  }, [token]);

  const loadMaterials = useCallback(async () => {
    if (!token) return;
    setMaterials(await apiFetch<Material[]>("/materials", { token }));
  }, [token]);

  useEffect(() => {
    void loadCollections();
    void loadMaterials();
  }, [loadCollections, loadMaterials]);

  if (status === "loading") {
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Your library</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/chat" className="text-slate-500 hover:text-brand">
            Companion
          </Link>
          <Link href="/quiz" className="text-slate-500 hover:text-brand">
            Quiz
          </Link>
          <Link href="/gaps" className="text-slate-500 hover:text-brand">
            Gaps
          </Link>
          <Link href="/plan" className="text-slate-500 hover:text-brand">
            Plan
          </Link>
          <Link href="/profile" className="text-slate-500 hover:text-brand">
            Profile
          </Link>
        </div>
      </header>
      <p className="mt-1 text-sm text-slate-600">
        Upload your study materials. We extract, chunk and embed them so your companion can
        learn from them.
      </p>

      <UploadZone
        token={token}
        collections={collections}
        onUploaded={loadMaterials}
      />
      <CollectionManager
        token={token}
        collections={collections}
        onChange={loadCollections}
      />
      <MaterialList
        token={token}
        materials={materials}
        collections={collections}
        onChange={loadMaterials}
      />
    </main>
  );
}
