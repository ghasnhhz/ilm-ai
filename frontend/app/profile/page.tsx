"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
type QuizStats = {
  sessions_completed: number;
  topics_covered: number;
  knowledge_score: number;
};
type TelegramConnection = {
  linked: boolean;
  current_streak: number;
  longest_streak: number;
  reminder: { hour: number; minute: number } | null;
};
type LinkToken = { token: string; deep_link: string };

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [me, setMe] = useState<Me | null>(null);
  const [goalText, setGoalText] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [telegram, setTelegram] = useState<TelegramConnection | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<Me>("/auth/me", { token });
    setMe(data);
    setGoalText(data.goal?.goal_text ?? "");
    setTargetDate(data.goal?.target_date ?? "");
    apiFetch<QuizStats>("/quiz/stats", { token }).then(setQuizStats).catch(() => {});
    apiFetch<TelegramConnection>("/telegram/connection", { token })
      .then(setTelegram)
      .catch(() => {});
  }, [token]);

  async function connectTelegram() {
    if (!token) return;
    try {
      const { deep_link } = await apiFetch<LinkToken>("/telegram/link-token", {
        token,
        method: "POST",
      });
      setLinkUrl(deep_link);
    } catch {
      setLinkUrl(null);
    }
  }

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
        <div className="flex items-center gap-3 text-sm">
          <Link href="/library" className="text-slate-500 hover:text-brand">
            Library
          </Link>
          <Link href="/quiz" className="text-slate-500 hover:text-brand">
            Quiz
          </Link>
          <Link href="/gaps" className="text-slate-500 hover:text-brand">
            Gaps
          </Link>
          <Link href="/plan" className="text-slate-500 hover:text-brand">
            Plan
          </Link>
          <Link href="/chat" className="text-slate-500 hover:text-brand">
            Companion
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-slate-500 hover:text-brand"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="mt-6 rounded-xl border border-slate-200 p-5">
        <p className="text-lg font-semibold">{me?.name || "Learner"}</p>
        <p className="text-sm text-slate-600">{me?.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
          {me?.provider} account
        </p>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Sessions completed", value: quizStats?.sessions_completed ?? "—" },
          { label: "Topics covered", value: quizStats?.topics_covered ?? "—" },
          {
            label: "Knowledge score",
            value: quizStats ? `${quizStats.knowledge_score}%` : "—",
          },
        ].map((s) => (
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

      <section className="mt-4 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Telegram</h2>
        {telegram?.linked ? (
          <div className="mt-2 text-sm text-slate-600">
            <p className="font-medium text-green-700">✓ Connected</p>
            <p className="mt-1">🔥 Current streak: {telegram.current_streak} day(s)</p>
            <p>🏆 Longest streak: {telegram.longest_streak} day(s)</p>
            <p className="mt-1">
              {telegram.reminder
                ? `⏰ Daily reminder at ${String(telegram.reminder.hour).padStart(2, "0")}:${String(
                    telegram.reminder.minute,
                  ).padStart(2, "0")} (set it in the bot with /reminder)`
                : "⏰ No reminder set — message the bot /reminder HH:MM"}
            </p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-slate-600">
              Link Telegram to quiz yourself, get daily reminders, and build a streak —
              without opening the app.
            </p>
            {linkUrl ? (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-brand-fg"
              >
                Open in Telegram to finish linking
              </a>
            ) : (
              <button
                onClick={connectTelegram}
                className="mt-3 rounded-lg border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand/5"
              >
                Connect Telegram
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
