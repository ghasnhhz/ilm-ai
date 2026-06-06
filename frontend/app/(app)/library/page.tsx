"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { Collection, Material } from "@/types/api";
import { CollectionManager } from "@/components/collection-manager";
import { MaterialList } from "@/components/material-list";
import { UploadZone } from "@/components/upload-zone";
import { Loading } from "@/components/ui/skeleton";

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
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Your library</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Upload your study materials. We extract, chunk and embed them so your
          companion can learn from them.
        </p>
      </div>

      <UploadZone token={token} collections={collections} onUploaded={loadMaterials} />
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
    </div>
  );
}
