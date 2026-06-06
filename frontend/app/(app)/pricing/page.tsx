"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";

type Usage = {
  tier: string;
  quizzes_today: number;
  quizzes_limit: number | null;
  uploads: number;
  uploads_limit: number | null;
  price_label: string;
};

const FREE_FEATURES = [
  "3 quizzes per day",
  "Up to 5 uploaded materials",
  "AI companion chat",
  "Knowledge gaps & learning plan",
];

const PREMIUM_FEATURES = [
  "Unlimited quizzes",
  "Unlimited uploads",
  "Priority response speed",
  "Everything in Free",
];

export default function PricingPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    apiFetch<Usage>("/payments/usage", { token }).then(setUsage).catch(() => {});
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const upgrade = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>("/payments/stripe/checkout", {
        token,
        method: "POST",
      });
      window.location.href = url;
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not start checkout. Try again later.",
      );
      setLoading(false);
    }
  }, [token]);

  const isPremium = usage?.tier === "premium";
  const priceLabel = usage?.price_label ?? "$4.99/mo";

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pricing</h1>
        <div className="flex items-center gap-3 text-sm">
          {token && (
            <Link href="/billing" className="text-slate-500 hover:text-brand">
              Billing
            </Link>
          )}
          <Link href="/profile" className="text-slate-500 hover:text-brand">
            Profile
          </Link>
        </div>
      </header>

      <p className="mt-2 text-sm text-slate-500">
        Learn for free, or go unlimited with premium.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold">Free</h2>
          <p className="mt-1 text-2xl font-bold">$0</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-slate-400">•</span>
                {f}
              </li>
            ))}
          </ul>
          {!isPremium && (
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your current plan
            </p>
          )}
        </section>

        <section className="rounded-xl border-2 border-brand p-5">
          <h2 className="font-semibold text-brand">Premium</h2>
          <p className="mt-1 text-2xl font-bold">{priceLabel}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand">✓</span>
                {f}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-green-600">
              ✓ Active
            </p>
          ) : token ? (
            <button
              onClick={upgrade}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-brand py-2.5 font-semibold text-brand-fg disabled:opacity-60"
            >
              {loading ? "Redirecting…" : "Upgrade with card"}
            </button>
          ) : (
            <Link
              href="/login"
              className="mt-4 block rounded-xl bg-brand py-2.5 text-center font-semibold text-brand-fg"
            >
              Log in to upgrade
            </Link>
          )}
          <p className="mt-2 text-center text-xs text-slate-400">
            Card via Stripe · Payme available in Uzbekistan
          </p>
        </section>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
