"use client";

import { Languages } from "lucide-react";

import {
  LOCALES,
  LOCALE_LABELS,
  isLocale,
  useT,
} from "@/lib/i18n";

/** Compact locale selector for the app header. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useT();
  return (
    <label className="flex items-center gap-1 text-muted-fg">
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value);
        }}
        aria-label={t("lang.label")}
        className="rounded-md border border-hairline bg-surface px-1.5 py-1 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
