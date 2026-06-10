# Ilm AI — Design System Specification

_Phase 0 deliverable: the original **specification** and rationale. It is now
**applied app-wide** — the tokens and component contracts here were rolled out
across every surface via the UI-overhaul PRs (#14–#18). For the system **as
built** (current tokens, component list, state conventions), see the canonical
[`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) at the repo root._

## Direction

_Ilm_ means **knowledge**. The product should feel **calm, focused, trustworthy, and
warm** — a patient tutor, not a flashy gadget. The brief explicitly bans the
dark-purple-gradient "AI startup" look. We achieve warmth with paper-like neutrals and a
single confident accent, and we keep risk low by **retaining the existing brand teal** as
the anchor color.

## 1. Color tokens

Palette: **deep teal + warm sand** ("warm library").

| Role | Token | Hex | Use |
|---|---|---|---|
| Primary / anchor | `--color-primary` | `#0E7490` | Primary buttons, links, active nav (existing brand) |
| Primary hover | `--color-primary-hover` | `#0B5E74` | Hover/active of primary |
| Primary fg | `--color-primary-fg` | `#ECFEFF` | Text/icons on primary |
| Accent | `--color-accent` | `#D97706` | Sparingly: highlights, streaks, "needs work" |
| Ink (text) | `--color-text` | `#1C2A33` | Body text |
| Muted text | `--color-text-muted` | `#5B6B73` | Secondary text (replaces ad-hoc `slate-500/600`) |
| Surface (page) | `--color-bg` | `#FBF8F2` | Page background (warm cream, replaces flat white) |
| Surface (card) | `--color-surface` | `#FFFFFF` | Cards/sheets |
| Sand / muted bg | `--color-muted` | `#ECE5D8` | Subtle fills, chips |
| Border | `--color-border` | `#E3DBCD` | Hairlines (warm, replaces `slate-200`) |
| Success | `--color-success` | `#15803D` | Correct/strong |
| Warning | `--color-warn` | `#B45309` | Stale/gaps |
| Danger | `--color-danger` | `#B91C1C` | Destructive/errors |

Define as CSS variables on `:root` in `globals.css`, then surface them through Tailwind so
existing utility-class habits keep working.

## 2. Typography

System/`Inter`-style stack. Scale (Tailwind-aligned):

| Token | Size / line-height | Use |
|---|---|---|
| `display` | 36–48px / tight | Landing hero |
| `h1` | 24px / 1.2 | Page titles |
| `h2` | 18px / 1.3 | Section headers |
| `body` | 16px / 1.5 | Default |
| `sm` | 14px / 1.5 | Secondary |
| `xs` | 12px / 1.4 | Meta, chips |

Weights: 400 body, 500 medium, 600 semibold, 700 bold. Ensure RU/UZ strings don't overflow
(test long labels).

## 3. Spacing, radius, shadow

- **Spacing:** keep Tailwind's 4px scale; standardize on `2/3/4/5/6/8` steps. Stop using
  arbitrary one-offs.
- **Radius:** `--radius-sm: 8px`, `--radius-md: 12px` (default card/button), `--radius-lg:
  16px`, `--radius-full` for pills. (Today's mix of `rounded-lg/xl/2xl` collapses to these.)
- **Shadow:** `--shadow-sm` (subtle card lift), `--shadow-md` (modals/popovers). Currently
  shadows are unused — add restrained depth.

## 4. Proposed `tailwind.config.ts` extension (spec only)

```ts
theme: {
  extend: {
    colors: {
      // map to the CSS vars above
      primary:   { DEFAULT: "#0E7490", hover: "#0B5E74", fg: "#ECFEFF" },
      accent:    "#D97706",
      ink:       "#1C2A33",
      muted:     { DEFAULT: "#ECE5D8", fg: "#5B6B73" },
      surface:   "#FFFFFF",
      page:      "#FBF8F2",
      hairline:  "#E3DBCD",
      // keep `brand`/`brand-fg` as aliases during migration so nothing breaks
      brand:     { DEFAULT: "#0E7490", fg: "#ECFEFF" },
    },
    borderRadius: { sm: "8px", md: "12px", lg: "16px" },
    boxShadow: {
      sm: "0 1px 2px rgba(28,42,51,.06), 0 1px 3px rgba(28,42,51,.08)",
      md: "0 4px 12px rgba(28,42,51,.10)",
    },
  },
}
```
Migration note: keep `brand`/`brand-fg` as aliases so the ~10 files using them keep
working while surfaces are migrated incrementally.

## 5. Component inventory to build (Phase 2)

Each replaces a current one-off; file references show where the duplication lives today.

| Component | Replaces / consolidates |
|---|---|
| `Button` (variant: primary/secondary/ghost/danger; size; `loading`) | repeated `rounded-xl bg-brand … text-brand-fg disabled:opacity-60` across `app/**/page.tsx`, `components/*` |
| `Input` / `Textarea` / `Select` | repeated `rounded-lg border border-slate-300 px-3 py-2.5` in auth-form, upload-zone, profile, quiz |
| `Card` | repeated `rounded-xl border border-slate-200 p-5` everywhere |
| `Modal` + `ConfirmDialog` | `window.confirm` / `window.prompt` in `material-list.tsx`, `collection-manager.tsx` |
| `Toast` | inline `msg` strings in profile/billing/upload |
| `Skeleton` / `Loading` | literal `Loading…` text on every page |
| `EmptyState` | hand-rolled empty blocks in gaps/plan/material-list |
| `AppShell` (logo + nav + mobile bottom-bar + active state) | per-page hand-rolled `<header>` link lists (inconsistent across `quiz`/`library`/`profile`/`chat`/`plan`/`gaps`) |
| `Icon` set | replaces emoji used as icons in plan/profile |

## 6. Accessibility baseline (apply during Phase 2)

- Re-enable zoom (remove `maximumScale: 1`).
- Visible focus rings on all interactive elements.
- Contrast ≥ 4.5:1 for text (verify accent/teal on cream).
- Semantic landmarks, button vs link correctness, alt text, keyboard nav for modals.
