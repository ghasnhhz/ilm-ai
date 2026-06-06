"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

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

function FeatureList({
  features,
  accent,
}: {
  features: string[];
  accent?: boolean;
}) {
  return (
    <ul className="mt-4 space-y-2 text-sm text-muted-fg">
      {features.map((f) => (
        <li key={f} className="flex gap-2">
          <Check
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              accent ? "text-primary" : "text-muted-fg",
            )}
            aria-hidden="true"
          />
          {f}
        </li>
      ))}
    </ul>
  );
}

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
    <div>
      <h1 className="text-2xl font-bold text-ink">Pricing</h1>
      <p className="mt-1 text-sm text-muted-fg">
        Learn for free, or go unlimited with premium.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Free</CardTitle>
          <p className="mt-1 text-2xl font-bold text-ink">$0</p>
          <FeatureList features={FREE_FEATURES} />
          {!isPremium && (
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-fg">
              Your current plan
            </p>
          )}
        </Card>

        <Card className="border-2 border-primary">
          <CardTitle className="text-primary">Premium</CardTitle>
          <p className="mt-1 text-2xl font-bold text-ink">{priceLabel}</p>
          <FeatureList features={PREMIUM_FEATURES} accent />
          {isPremium ? (
            <p className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              Active
            </p>
          ) : token ? (
            <Button className="mt-4 w-full" onClick={upgrade} loading={loading}>
              Upgrade with card
            </Button>
          ) : (
            <Button href="/login" className="mt-4 w-full">
              Log in to upgrade
            </Button>
          )}
          <p className="mt-2 text-center text-xs text-muted-fg">
            Card via Stripe · Payme available in Uzbekistan
          </p>
        </Card>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
