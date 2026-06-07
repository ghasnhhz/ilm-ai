"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import type { TKey } from "@/lib/i18n/dictionaries/en";
import { cn } from "@/lib/cn";

type Usage = {
  tier: string;
  quizzes_today: number;
  quizzes_limit: number | null;
  uploads: number;
  uploads_limit: number | null;
  price_label: string;
};

const FREE_FEATURE_KEYS: TKey[] = [
  "pricing.free.f1",
  "pricing.free.f2",
  "pricing.free.f3",
  "pricing.free.f4",
];

const PREMIUM_FEATURE_KEYS: TKey[] = [
  "pricing.premium.f1",
  "pricing.premium.f2",
  "pricing.premium.f3",
  "pricing.premium.f4",
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
  const { toast } = useToast();
  const { t } = useT();

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

  // Returning from an abandoned Stripe checkout (cancel_url = /pricing?canceled=1).
  // Reassure rather than alarm, and strip the query param.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("canceled") === "1") {
      toast(t("pricing.canceledToast"), "info");
      window.history.replaceState(null, "", "/pricing");
    }
  }, [toast, t]);

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
        e instanceof ApiError ? e.message : t("pricing.checkoutError"),
      );
      setLoading(false);
    }
  }, [token, t]);

  const isPremium = usage?.tier === "premium";
  const priceLabel = usage?.price_label ?? "$4.99/mo";

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{t("pricing.title")}</h1>
      <p className="mt-1 text-sm text-muted-fg">{t("pricing.subtitle")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>{t("pricing.free")}</CardTitle>
          <p className="mt-1 text-2xl font-bold text-ink">$0</p>
          <FeatureList features={FREE_FEATURE_KEYS.map((k) => t(k))} />
          {!isPremium && (
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-fg">
              {t("pricing.currentPlan")}
            </p>
          )}
        </Card>

        <Card className="border-2 border-primary">
          <CardTitle className="text-primary">{t("pricing.premium")}</CardTitle>
          <p className="mt-1 text-2xl font-bold text-ink">{priceLabel}</p>
          <FeatureList features={PREMIUM_FEATURE_KEYS.map((k) => t(k))} accent />
          {isPremium ? (
            <p className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("pricing.active")}
            </p>
          ) : token ? (
            <Button className="mt-4 w-full" onClick={upgrade} loading={loading}>
              {t("pricing.upgradeWithCard")}
            </Button>
          ) : (
            <Button href="/login" className="mt-4 w-full">
              {t("pricing.loginToUpgrade")}
            </Button>
          )}
          <p className="mt-2 text-center text-xs text-muted-fg">
            {t("pricing.paymentMethods")}
          </p>
        </Card>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
