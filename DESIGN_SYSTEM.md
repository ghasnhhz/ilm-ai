# Ilm AI — Design System (as built)

Canonical reference for the design system **as it ships today**. The original
spec and rationale (palette reasoning, accessibility brief, component inventory)
live in [`docs/design-system.md`](docs/design-system.md). This file documents the
tokens and conventions actually wired into the app, so components consume tokens
and never hardcode hex values.

**Single source of truth:** `frontend/tailwind.config.ts` (Tailwind theme) +
`frontend/app/globals.css` (CSS variables on `:root`). Change a token in those
two files — never in a component.

## Direction

_Ilm_ means **knowledge**. Calm, focused, trustworthy, warm — a patient tutor,
not a flashy gadget. No dark-purple "AI startup" gradient. Warmth comes from
paper-like neutrals and one confident accent, anchored by the existing brand teal.
Audience: teenagers to retirees across Uzbekistan / Central Asia, mostly on
phones — so **mobile-first** and trilingual (Uzbek / Russian / English).

## 1. Color tokens

Palette: **deep teal + warm sand** ("warm library"). Tailwind color name → hex.

| Token (Tailwind) | Hex | Use |
|---|---|---|
| `primary` | `#0E7490` | Primary buttons, links, active nav |
| `primary-hover` | `#0B5E74` | Hover/active of primary |
| `primary-fg` | `#ECFEFF` | Text/icons on primary |
| `accent` | `#D97706` | Sparingly: highlights, streaks, "needs work" |
| `ink` | `#1C2A33` | Body text |
| `muted-fg` | `#5B6B73` | Secondary text |
| `muted` | `#ECE5D8` | Sand fills, chips |
| `surface` | `#FFFFFF` | Cards / sheets |
| `page` | `#FBF8F2` | Warm cream page background |
| `hairline` | `#E3DBCD` | Warm borders |
| `success` | `#15803D` | Correct / strong |
| `warn` | `#B45309` | Stale / gaps |
| `danger` | `#B91C1C` | Destructive / errors |

`brand` / `brand-fg` remain as aliases of `primary` for backward compatibility;
prefer `primary` in new code. Tokens are also exposed as CSS variables
(`--color-*`) in `globals.css` for cases that can't use a utility class.

## 2. Typography

System / `Inter`-style stack. Scale (Tailwind-aligned): `display` 36–48px (hero),
`h1` 24px (page titles, `text-2xl font-bold text-ink`), `h2` 18px (section
headers), `body` 16px, `sm` 14px (secondary), `xs` 12px (meta / chips).
Weights: 400 / 500 / 600 / 700. Verify RU/UZ strings don't overflow.

## 3. Spacing, radius, shadow

- **Spacing:** Tailwind 4px scale, standardized on `2/3/4/5/6/8` steps.
- **Radius:** `rounded-sm` 8px · `rounded-md` 12px (default card/button) ·
  `rounded-lg` 16px · `rounded-full` for pills.
- **Shadow:** `shadow-sm` (subtle card lift) · `shadow-md` (modals/popovers).

## 4. Motion & accessibility baseline

- Entrance animations: `animate-fade-in`, `animate-fade-in-up`,
  `animate-slide-in-left` (defined in `tailwind.config.ts`).
- `prefers-reduced-motion` disables entrance animations (`globals.css`).
- Visible focus rings on every interactive element:
  `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
  focus-visible:ring-offset-page`.
- Zoom enabled (no `maximumScale`); contrast ≥ 4.5:1; semantic landmarks;
  `button` vs `link` correctness; keyboard-navigable modals.

## 5. Components (`frontend/components/ui/`)

Consume these instead of re-deriving one-off styles. Pages stay thin and delegate
loading / empty / error states to these primitives.

| Component | File | Notes |
|---|---|---|
| `Button` | `ui/button.tsx` | variants primary/secondary/ghost/danger; `size`; `loading` |
| `Input` / `PasswordInput` / `Textarea` | `ui/input.tsx` | token borders, focus rings |
| `Card` | `ui/card.tsx` | `rounded-md border border-hairline bg-surface shadow-sm` |
| `Badge` | `ui/badge.tsx` | status pills |
| `Modal` / `ConfirmDialog` | `ui/modal.tsx` | replaces `window.confirm/prompt` |
| `Toast` | `ui/toast.tsx` | `useToast()` for inline status |
| `Skeleton` / `Loading` | `ui/skeleton.tsx` | loading placeholders |
| `EmptyState` | `ui/empty-state.tsx` | hand-rolled empty blocks |
| `LanguageSwitcher` | `ui/language-switcher.tsx` | en / ru / uz |
| `AppShell` | `components/app-shell.tsx` | logo + sidebar/drawer nav + active state + mobile bar |

## 6. State conventions

Every data-fetching screen shows three states:

- **Loading** — `Loading` / `Skeleton`, never a bare "Loading…" string.
- **Empty** — `EmptyState` with a friendly prompt and a primary action.
- **Error** — `text-danger` message or a `Toast`; trilingual via `useT()`.

## Delivery status

Applied app-wide. Delivered via the merged UI-overhaul PRs **#14** (landing),
**#15** (design system rolled across every surface), **#16** (hardening),
**#17** (live E2E verify), under **#18 `feature/ui-overhaul`**. All six Tier-1
demo screens (landing, auth, library, chat, quiz, plan) and the Tier-2 pages
(profile, billing, pricing, gaps) consume these tokens.
