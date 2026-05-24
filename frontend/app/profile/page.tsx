"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";

type Goal = { goal_text: string; target_date: string | null };
type Me = {
  id: string;
  email: string;
  name: string | null;
  provider: string;
  goal: Goal | null;
};

const stats = [
  { label: "Sessions completed", value: "—" },
  { label: "Topics covered", value: "—" },
  { label: "Knowledge score", value: "—" },
];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [me, setMe] = useState<Me | null>(null);
  const [goalText, setGoalText] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<Me>("/auth/me", { token });
    setMe(data);
    setGoalText(data.goal?.goal_text ?? "");
    setTargetDate(data.goal?.target_date ?? "");
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveGoal() {
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch("/auth/goal", {
        token,
        method: "PUT",
        body: { goal_text: goalText, target_date: targetDate || null },
      });
      await load();
      setMsg("Saved");
    } catch {
      setMsg("Could not save goal");
    }
    setSaving(false);
  }

  if (status === "loading") {
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Your profile</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-slate-500 hover:text-brand"
        >
          Log out
        </button>
      </header>

      <section className="mt-6 rounded-xl border border-slate-200 p-5">
        <p className="text-lg font-semibold">{me?.name || "Learner"}</p>
        <p className="text-sm text-slate-600">{me?.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
          {me?.provider} account
        </p>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 p-3 text-center"
          >
            <p className="text-xl font-bold text-brand">{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Your learning goal</h2>
        <p className="mt-1 text-sm text-slate-600">
          What do you want to achieve, and by when?
        </p>
        <textarea
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          rows={3}
          placeholder="e.g. Understand cloud architecture well enough to pass the AWS exam"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
        />
        <label className="mt-3 block text-sm text-slate-600">
          Target date
          <input
            type="date"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5"
            value={targetDate ?? ""}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={saveGoal}
            disabled={saving || !goalText.trim()}
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-brand-fg disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save goal"}
          </button>
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
        </div>
      </section>
    </main>
  );
}
