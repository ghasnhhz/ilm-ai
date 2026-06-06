import type { TKey } from "./en";

// Russian overrides. Missing keys fall back to English (see lib/i18n/index.tsx).
// TODO(i18n): reviewed/expanded by a fluent Russian speaker.
export const ru: Partial<Record<TKey, string>> = {
  "nav.library": "Библиотека",
  "nav.chat": "Помощник",
  "nav.quiz": "Тест",
  "nav.gaps": "Пробелы",
  "nav.plan": "План",
  "nav.profile": "Профиль",
  "action.login": "Войти",
  "action.signup": "Регистрация",
  "action.logout": "Выйти",
  "lang.label": "Язык",
};
