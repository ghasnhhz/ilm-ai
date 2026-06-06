import type { Config } from "tailwindcss";

// Design tokens — "warm library, patient tutor" (deep teal + warm sand).
// See docs/design-system.md. Tokens are surfaced both as Tailwind colors and as
// CSS variables (globals.css) so existing utility-class habits keep working.
// NOTE: `brand`/`brand-fg` are kept as aliases of `primary` so the ~10 files still
// using them during the incremental migration (Phase 2) don't break.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0e7490",
          hover: "#0b5e74",
          fg: "#ecfeff",
        },
        accent: "#d97706",
        ink: "#1c2a33",
        muted: {
          DEFAULT: "#ece5d8", // sand fill / chips
          fg: "#5b6b73", // secondary text
        },
        surface: "#ffffff", // cards/sheets
        page: "#fbf8f2", // warm cream page background
        hairline: "#e3dbcd", // warm borders (replaces slate-200)
        success: "#15803d",
        warn: "#b45309",
        danger: "#b91c1c",
        // migration aliases — do not remove until every surface is migrated
        brand: {
          DEFAULT: "#0e7490",
          fg: "#ecfeff",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(28,42,51,.06), 0 1px 3px rgba(28,42,51,.08)",
        md: "0 4px 12px rgba(28,42,51,.10)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
