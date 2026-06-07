"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { en, type TKey } from "./dictionaries/en";
import { ru } from "./dictionaries/ru";
import { uz } from "./dictionaries/uz";

export const LOCALES = ["en", "ru", "uz"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uz: "O‘zbek",
};

export const LOCALE_COOKIE = "locale";

const DICTS: Record<Locale, Partial<Record<TKey, string>>> = { en, ru, uz };

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

type TVars = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TKey, vars?: TVars) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LangProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Restore the saved locale after hydration. We deliberately start from
  // `initialLocale` (the SSR value) so the first client render matches the
  // server and there's no hydration mismatch, then switch once mounted. This
  // keeps the root layout static (no cookies() — which would force the whole
  // app, incl. the landing page, into dynamic rendering).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LOCALE_COOKIE);
    } catch {
      // ignore
    }
    if (!saved) {
      const match = document.cookie.match(
        new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`),
      );
      saved = match ? match[1] : null;
    }
    if (isLocale(saved) && saved !== locale) {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    try {
      window.localStorage.setItem(LOCALE_COOKIE, next);
    } catch {
      // localStorage may be unavailable (private mode) — cookie still set.
    }
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: TKey, vars?: TVars) => {
      let s: string = DICTS[locale][key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within a LangProvider");
  return ctx;
}
