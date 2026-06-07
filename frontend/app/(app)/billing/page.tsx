"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/skeleton";
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
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type PaymentEvent = {
  provider: string;
  event_type: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
};

// Map raw webhook event types to label keys. `null` hides the row — internal churn
// (subscription.created/updated) the user doesn't need to see — so a single upgrade
// reads as one clean entry instead of three. `undefined` (unknown event) falls back
// to a readable form of the raw type.
const EVENT_LABEL_KEYS: Record<string, TKey | null> = {
  "invoice.paid": "billing.event.payment",
  "invoice.payment_failed": "billing.event.paymentFailed",
  "checkout.session.completed": "billing.event.subStarted",
  "customer.subscription.created": null,
  "customer.subscription.updated": null,
  "customer.subscription.deleted": "billing.event.subCanceled",
};

function formatAmount(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null;
  // Stripe amounts are in the smallest currency unit (e.g. cents).
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function Meter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const { t } = useT();
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted-fg">
          {used}
          {limit !== null ? ` / ${limit}` : ` · ${t("billing.unlimited")}`}
        </span>
      </div>
      {limit !== null && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className={cn(
              "h-1.5 rounded-full",
              pct >= 100 ? "bg-danger" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </Card>
  );
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const { toast } = useToast();
  const { t } = useT();

  const [usage, setUsage] = useState<Usage | null>(null);
  const [history, setHistory] = useState<PaymentEvent[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    apiFetch<Usage>("/payments/usage", { token }).then(setUsage).catch(() => {});
    apiFetch<PaymentEvent[]>("/payments/history", { token })
      .then(setHistory)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Returning from a successful Stripe checkout (success_url = /billing?upgraded=1).
  // Celebrate, refresh usage so the new tier shows once the webhook lands, and strip
  // the query param so a refresh doesn't re-fire the toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      toast(t("billing.upgradedToast"), "success");
      void load();
      window.history.replaceState(null, "", "/billing");
    }
  }, [toast, load, t]);

  async function cancel() {
    if (!token) return;
    try {
      await apiFetch("/payments/cancel", { token, method: "POST" });
      await load();
      toast(t("billing.canceled"), "success");
    } catch {
      toast(t("billing.cancelError"), "error");
    }
  }

  async function resume() {
    if (!token) return;
    try {
      await apiFetch("/payments/resume", { token, method: "POST" });
      await load();
      toast(t("billing.resumed"), "success");
    } catch {
      toast(t("billing.resumeError"), "error");
    }
  }

  if (status === "loading") {
    return <Loading />;
  }

  const isPremium = usage?.tier === "premium";
  const canceling = isPremium && Boolean(usage?.cancel_at_period_end);
  const periodEnd = usage?.current_period_end
    ? new Date(usage.current_period_end).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const historyRows = history
    .map((e) => {
      const key =
        e.event_type in EVENT_LABEL_KEYS
          ? EVENT_LABEL_KEYS[e.event_type]
          : undefined;
      if (key === null) return null; // hidden internal event
      const label = key ? t(key) : e.event_type.replace(/[._]/g, " ");
      return { e, label };
    })
    .filter((r): r is { e: PaymentEvent; label: string } => r !== null);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("billing.title")}</h1>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-fg">{t("billing.currentPlan")}</p>
            <p className="text-lg font-semibold capitalize text-ink">
              {usage?.tier ?? "—"}
            </p>
            {isPremium && periodEnd && (
              <p className="mt-0.5 text-xs text-muted-fg">
                {canceling
                  ? t("billing.endsOn", { date: periodEnd })
                  : t("billing.renewsOn", { date: periodEnd })}
              </p>
            )}
          </div>
          {!isPremium ? (
            <Button href="/pricing">{t("billing.upgrade")}</Button>
          ) : canceling ? (
            <Button onClick={resume}>{t("billing.resume")}</Button>
          ) : (
            <Button variant="secondary" onClick={cancel}>
              {t("billing.cancel")}
            </Button>
          )}
        </div>
      </Card>

      {usage && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Meter
            label={t("billing.quizzesToday")}
            used={usage.quizzes_today}
            limit={usage.quizzes_limit}
          />
          <Meter
            label={t("billing.uploads")}
            used={usage.uploads}
            limit={usage.uploads_limit}
          />
        </div>
      )}

      <div>
        <CardTitle>{t("billing.paymentHistory")}</CardTitle>
        {historyRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-fg">{t("billing.noPayments")}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {historyRows.map(({ e, label }, i) => {
              const amount = formatAmount(e.amount, e.currency);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-hairline px-4 py-2.5 text-sm"
                >
                  <span className="text-ink">{label}</span>
                  <span className="flex items-center gap-3 text-muted-fg">
                    {amount && (
                      <span className="font-medium text-ink">{amount}</span>
                    )}
                    <span>{new Date(e.created_at).toLocaleDateString()}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
