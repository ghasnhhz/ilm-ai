"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type Usage = {
  tier: string;
  quizzes_today: number;
  quizzes_limit: number | null;
  uploads: number;
  uploads_limit: number | null;
  price_label: string;
};

type PaymentEvent = {
  provider: string;
  event_type: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
};

function Meter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted-fg">
          {used}
          {limit !== null ? ` / ${limit}` : " · unlimited"}
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

  async function cancel() {
    if (!token) return;
    try {
      await apiFetch("/payments/cancel", { token, method: "POST" });
      await load();
      toast("Your subscription was canceled.", "success");
    } catch {
      toast("Could not cancel. Try again later.", "error");
    }
  }

  if (status === "loading") {
    return <Loading />;
  }

  const isPremium = usage?.tier === "premium";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Billing</h1>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-fg">Current plan</p>
            <p className="text-lg font-semibold capitalize text-ink">
              {usage?.tier ?? "—"}
            </p>
          </div>
          {isPremium ? (
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          ) : (
            <Button href="/pricing">Upgrade</Button>
          )}
        </div>
      </Card>

      {usage && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Meter
            label="Quizzes today"
            used={usage.quizzes_today}
            limit={usage.quizzes_limit}
          />
          <Meter label="Uploads" used={usage.uploads} limit={usage.uploads_limit} />
        </div>
      )}

      <div>
        <CardTitle>Payment history</CardTitle>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-fg">No payments yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((e, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border border-hairline px-4 py-2.5 text-sm"
              >
                <span className="capitalize text-ink">
                  {e.provider} · {e.event_type}
                </span>
                <span className="text-muted-fg">
                  {new Date(e.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
