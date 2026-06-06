// English is the source of truth: every key the app uses must exist here.
// ru.ts / uz.ts are partial overrides that fall back to these strings.
export const en = {
  "nav.library": "Library",
  "nav.chat": "Companion",
  "nav.quiz": "Quiz",
  "nav.gaps": "Gaps",
  "nav.plan": "Plan",
  "nav.profile": "Profile",
  "action.login": "Log in",
  "action.signup": "Sign up",
  "action.logout": "Log out",
  "lang.label": "Language",
} as const;

export type TKey = keyof typeof en;
