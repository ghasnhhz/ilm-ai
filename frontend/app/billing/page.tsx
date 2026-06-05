"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";

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

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">
          {used}
          {limit !== null ? ` / ${limit}` : " · unlimited"}
        </span>
      </div>
      {limit !== null && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full ${pct >= 100 ? "bg-red-500" : "bg-brand"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [usage, setUsage] = useState<Usage | null>(null);
  const [history, setHistory] = useState<PaymentEvent[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

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
    setMsg(null);
    try {
      await apiFetch("/payments/cancel", { token, method: "POST" });
      await load();
      setMsg("Your subscription was canceled.");
    } catch {
      setMsg("Could not cancel. Try again later.");
    }
  }

  if (status === "loading") {
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  const isPremium = usage?.tier === "premium";

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Billing</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/pricing" className="text-slate-500 hover:text-brand">
            Pricing
          </Link>
          <Link href="/profile" className="text-slate-500 hover:text-brand">
            Profile
          </Link>
        </div>
      </header>

      <section className="mt-6 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <p className="text-lg font-semibold capitalize">{usage?.tier ?? "—"}</p>
          </div>
          {isPremium ? (
            <button
              onClick={cancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-red-400 hover:text-red-600"
            >
              Cancel
            </button>
          ) : (
            <Link
              href="/pricing"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg"
            >
              Upgrade
            </Link>
          )}
        </div>
        {msg && <p className="mt-3 text-sm text-slate-500">{msg}</p>}
      </section>

      {usage && (
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Meter label="Quizzes today" used={usage.quizzes_today} limit={usage.quizzes_limit} />
          <Meter label="Uploads" used={usage.uploads} limit={usage.uploads_limit} />
        </section>
      )}

      <section className="mt-4">
        <h2 className="font-semibold">Payment history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No payments yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((e, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
              >
                <span className="capitalize">
                  {e.provider} · {e.event_type}
                </span>
                <span className="text-slate-400">
                  {new Date(e.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
