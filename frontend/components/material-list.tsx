"use client";

import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Collection, Material } from "@/types/api";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

const STATUS_VARIANT: Record<
  Material["status"],
  "success" | "warn" | "danger"
> = {
  ready: "success",
  processing: "warn",
  failed: "danger",
};

const STATUS_KEY = {
  ready: "material.status.ready",
  processing: "material.status.processing",
  failed: "material.status.failed",
} as const;

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
  const { toast } = useToast();
  const { t } = useT();
  const [pending, setPending] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);

  const collectionName = (id: string | null) =>
    id
      ? collections.find((c) => c.id === id)?.name ?? t("material.unknown")
      : t("material.uncategorized");

  async function confirmRemove() {
    if (!token || !pending) return;
    setDeleting(true);
    try {
      await apiFetch(`/materials/${pending.id}`, { token, method: "DELETE" });
      await onChange();
      toast(t("material.deleted", { title: pending.title }), "success");
      setPending(null);
    } catch {
      toast(t("material.deleteFailed"), "error");
    }
    setDeleting(false);
  }

  return (
    <Card>
      <CardTitle>{t("material.title")}</CardTitle>

      {materials.length === 0 ? (
        <p className="mt-3 text-sm text-muted-fg">{t("material.empty")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {materials.map((m) => (
            <li
              key={m.id}
              className="rounded-md border border-hairline p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <FileText
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-fg"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{m.title}</p>
                    <p className="mt-0.5 text-xs text-muted-fg">
                      {m.file_type.toUpperCase()} ·{" "}
                      {collectionName(m.collection_id)} ·{" "}
                      {t("material.chunks", { count: m.chunk_count })}
                    </p>
                    {m.status === "failed" && m.error && (
                      <p className="mt-1 text-xs text-danger">{m.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={STATUS_VARIANT[m.status]}>
                    {t(STATUS_KEY[m.status])}
                  </Badge>
                  <button
                    onClick={() => setPending(m)}
                    aria-label={t("material.deleteAria", { title: m.title })}
                    className="rounded p-1 text-muted-fg hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={t("material.deleteTitle")}
        message={
          pending ? t("material.deleteMessage", { title: pending.title }) : ""
        }
        confirmLabel={t("common.delete")}
        danger
        loading={deleting}
        onConfirm={confirmRemove}
        onClose={() => setPending(null)}
      />
    </Card>
  );
}
