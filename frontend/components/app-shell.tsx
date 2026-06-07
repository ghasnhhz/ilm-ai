"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut, useSession } from "next-auth/react";
import {
  CalendarDays,
  CreditCard,
  GraduationCap,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useT } from "@/lib/i18n";
import type { TKey } from "@/lib/i18n/dictionaries/en";
import { cn } from "@/lib/cn";

type NavItem = { href: string; labelKey: TKey; icon: LucideIcon };

// Single source of truth for the primary destinations — replaces the per-page
// hand-rolled header link lists that were inconsistent across every surface.
const NAV: NavItem[] = [
  { href: "/library", labelKey: "nav.library", icon: Library },
  { href: "/chat", labelKey: "nav.chat", icon: MessageSquare },
  { href: "/quiz", labelKey: "nav.quiz", icon: GraduationCap },
  { href: "/gaps", labelKey: "nav.gaps", icon: Target },
  { href: "/plan", labelKey: "nav.plan", icon: CalendarDays },
  { href: "/profile", labelKey: "nav.profile", icon: User },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
}

// Shared row styling for every sidebar link/button so destinations and the
// pinned account actions read as one consistent, generously-sized list.
const rowBase =
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page";
const rowActive = "bg-primary/10 text-primary";
const rowIdle = "text-muted-fg hover:bg-muted hover:text-ink";

/**
 * The sidebar's inner content — logo, primary destinations, and a pinned bottom
 * cluster (language, billing, log out). Rendered once and reused by both the
 * persistent desktop rail and the mobile drawer. `onNavigate` lets the drawer
 * close itself when a link inside it is tapped.
 */
function SidebarContent({
  authed,
  isActive,
  t,
  onNavigate,
}: {
  authed: boolean;
  isActive: (href: string) => boolean;
  t: (key: TKey) => string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <Link
        href={authed ? "/library" : "/"}
        onClick={onNavigate}
        className="mb-2 inline-flex rounded-md px-3 py-2 text-lg font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        Ilm AI
      </Link>

      {authed && (
        <nav aria-label="Primary" className="flex flex-col gap-1">
          {NAV.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(rowBase, isActive(href) ? rowActive : rowIdle)}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-3">
        <div className="px-3 py-1">
          <LanguageSwitcher />
        </div>

        {authed ? (
          <>
            <Link
              href="/billing"
              onClick={onNavigate}
              aria-current={isActive("/billing") ? "page" : undefined}
              className={cn(rowBase, isActive("/billing") ? rowActive : rowIdle)}
            >
              <CreditCard className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t("nav.billing")}
            </Link>
            <button
              type="button"
              onClick={() => {
                onNavigate?.();
                signOut({ callbackUrl: "/" });
              }}
              className={cn(rowBase, rowIdle, "w-full text-left")}
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t("action.logout")}
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2 px-1 pt-1">
            <Button href="/login" variant="ghost" size="sm" onClick={onNavigate}>
              {t("action.login")}
            </Button>
            <Button href="/signup" size="sm" onClick={onNavigate}>
              {t("action.signup")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mobile slide-out drawer. Mirrors the accessibility recipe in
 * components/ui/modal.tsx (portal to <body>, overlay + Esc to close, body scroll
 * lock, focus moved in with a simple focus trap, focus restored on close).
 */
function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevFocus = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusables = ref.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 animate-fade-in bg-ink/40" aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] animate-slide-in-left flex-col overflow-y-auto border-r border-hairline bg-page shadow-md focus:outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Shared application chrome: a persistent left sidebar on desktop, and on mobile
 * a slim top bar whose hamburger opens the same sidebar as a drawer. Applied via
 * the (app) route-group layout so every signed-in surface looks like one product.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isActive = useIsActive();
  const { t } = useT();
  const authed = status === "authenticated";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes (covers taps on nav links and
  // any programmatic navigation).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-hairline bg-page md:flex">
        <SidebarContent authed={authed} isActive={isActive} t={t} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-hairline bg-page/85 px-5 py-3 backdrop-blur md:hidden">
        <Link
          href={authed ? "/library" : "/"}
          className="text-lg font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          Ilm AI
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-md p-2 text-muted-fg transition-colors hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      <MobileDrawer open={open} onClose={() => setOpen(false)}>
        <SidebarContent
          authed={authed}
          isActive={isActive}
          t={t}
          onNavigate={() => setOpen(false)}
        />
      </MobileDrawer>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-5 py-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
