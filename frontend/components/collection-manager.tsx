"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Collection } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, PromptDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

export function CollectionManager({
  token,
  collections,
  onChange,
}: {
  token: string | undefined;
  collections: Collection[];
  onChange: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const { t } = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const [removing, setRemoving] = useState(false);

  async function create() {
    if (!token || !name.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/collections", {
        token,
        method: "POST",
        body: { name: name.trim() },
      });
      setName("");
      await onChange();
    } catch {
      toast(t("collection.createFailed"), "error");
    }
    setBusy(false);
  }

  async function confirmRename(next: string) {
    if (!token || !renaming || next === renaming.name) {
      setRenaming(null);
      return;
    }
    try {
      await apiFetch(`/collections/${renaming.id}`, {
        token,
        method: "PUT",
        body: { name: next },
      });
      await onChange();
    } catch {
      toast(t("collection.renameFailed"), "error");
    }
    setRenaming(null);
  }

  async function confirmDelete() {
    if (!token || !deleting) return;
    setRemoving(true);
    try {
      await apiFetch(`/collections/${deleting.id}`, { token, method: "DELETE" });
      await onChange();
      setDeleting(null);
    } catch {
      toast(t("collection.deleteFailed"), "error");
    }
    setRemoving(false);
  }

  return (
    <Card>
      <CardTitle>{t("collection.title")}</CardTitle>
      <p className="mt-1 text-sm text-muted-fg">{t("collection.subtitle")}</p>

      <div className="mt-3 flex gap-2">
        <Input
          placeholder={t("collection.newPlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <Button
          className="shrink-0"
          onClick={create}
          loading={busy}
          disabled={!name.trim()}
        >
          {t("collection.add")}
        </Button>
      </div>

      {collections.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {collections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-hairline px-3 py-2"
            >
              <span className="text-sm font-medium text-ink">{c.name}</span>
              <span className="flex gap-3 text-xs">
                <button
                  onClick={() => setRenaming(c)}
                  className="text-muted-fg hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t("collection.rename")}
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  className="text-muted-fg hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t("collection.delete")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <PromptDialog
        open={renaming !== null}
        title={t("collection.renameTitle")}
        defaultValue={renaming?.name ?? ""}
        confirmLabel={t("collection.rename")}
        onConfirm={confirmRename}
        onClose={() => setRenaming(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={t("collection.deleteTitle")}
        message={
          deleting ? t("collection.deleteMessage", { name: deleting.name }) : ""
        }
        confirmLabel={t("common.delete")}
        danger
        loading={removing}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}
