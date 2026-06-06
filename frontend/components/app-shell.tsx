"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  CalendarDays,
  GraduationCap,
  Library,
  LogOut,
  MessageSquare,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

// Single source of truth for navigation — replaces the per-page hand-rolled
// header link lists that were inconsistent across every surface.
const NAV: NavItem[] = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/chat", label: "Companion", icon: MessageSquare },
  { href: "/quiz", label: "Quiz", icon: GraduationCap },
  { href: "/gaps", label: "Gaps", icon: Target },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Shared application chrome: consistent top header (logo + desktop nav + account
 * actions), a mobile bottom tab bar, and the page container. Applied via the
 * (app) route-group layout so every signed-in surface looks like one product.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isActive = useIsActive();
  const authed = status === "authenticated";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-hairline bg-page/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
          <Link
            href={authed ? "/library" : "/"}
            className="text-lg font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page"
          >
            Ilm AI
          </Link>

          {authed && (
            <nav
              aria-label="Primary"
              className="hidden items-center gap-1 md:flex"
            >
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive(href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-fg hover:text-ink",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {authed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            ) : (
              <>
                <Button href="/login" variant="ghost" size="sm">
                  Log in
                </Button>
                <Button href="/signup" size="sm">
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 pb-24 md:pb-10">
        {children}
      </main>

      {authed && (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-hairline bg-page md:hidden"
        >
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                isActive(href) ? "text-primary" : "text-muted-fg",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
