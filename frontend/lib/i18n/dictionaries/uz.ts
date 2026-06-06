import type { TKey } from "./en";

// Uzbek overrides. Missing keys fall back to English (see lib/i18n/index.tsx).
// TODO(i18n): reviewed/expanded by a fluent Uzbek speaker.
export const uz: Partial<Record<TKey, string>> = {
  "nav.library": "Kutubxona",
  "nav.chat": "Hamroh",
  "nav.quiz": "Test",
  "nav.gaps": "Bo'shliqlar",
  "nav.plan": "Reja",
  "nav.profile": "Profil",
  "action.login": "Kirish",
  "action.signup": "Ro'yxatdan o'tish",
  "action.logout": "Chiqish",
  "lang.label": "Til",
};
