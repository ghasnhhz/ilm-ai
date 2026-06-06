"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";

type PlanDay = {
  day: number;
  date: string | null;
  focus: string;
  materials: string[];
  tasks: string[];
  concepts: string[];
};

type PlanContent = {
  summary: string;
  days: PlanDay[];
};

type LearningPlanOut = {
  plan: PlanContent | null;
  stale: boolean;
  goal_text: string | null;
  target_date: string | null;
  updated_at: string | null;
};

export default function PlanPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [data, setData] = useState<LearningPlanOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<LearningPlanOut>("/plan", { token });
      setData(res);
    } catch {
      setError("Could not load your plan.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = useCallback(async () => {
    if (!token) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await apiFetch<LearningPlanOut>("/plan/generate", {
        token,
        method: "POST",
      });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not generate a plan. Upload materials and set a goal first.",
      );
    }
    setGenerating(false);
  }, [token]);

  if (status === "loading") {
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  const plan = data?.plan ?? null;

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Learning plan</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/quiz" className="text-slate-500 hover:text-brand">
            Quiz
          </Link>
          <Link href="/gaps" className="text-slate-500 hover:text-brand">
            Gaps
          </Link>
          <Link href="/library" className="text-slate-500 hover:text-brand">
            Library
          </Link>
        </div>
      </header>

      {loading && <p className="mt-6 text-slate-500">Loading your plan…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !plan && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-semibold text-slate-700">No plan yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Generate a day-by-day plan from your materials, your goal, and the gaps
            from your quizzes. Set a goal on your{" "}
            <Link href="/profile" className="text-brand underline">
              profile
            </Link>{" "}
            first for a date-aware plan.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="mt-4 rounded-xl bg-brand px-5 py-2.5 font-semibold text-brand-fg disabled:opacity-60"
          >
            {generating ? "Building your plan…" : "Generate my plan"}
          </button>
        </div>
      )}

      {!loading && plan && (
        <div className="mt-6">
          {data?.stale && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                Your materials or results changed — this plan may be outdated.
              </p>
              <button
                onClick={generate}
                disabled={generating}
                className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-fg disabled:opacity-60"
              >
                {generating ? "…" : "Regenerate"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-slate-700">{plan.summary}</p>
            {data?.target_date && (
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                Target: {data.target_date}
              </p>
            )}
            {!data?.stale && (
              <button
                onClick={generate}
                disabled={generating}
                className="mt-3 text-sm font-semibold text-brand disabled:opacity-60"
              >
                {generating ? "Regenerating…" : "Regenerate plan"}
              </button>
            )}
          </div>

          {/* Timeline */}
          <ol className="mt-5 space-y-3">
            {plan.days.map((d) => (
              <li
                key={d.day}
                className="relative rounded-xl border border-slate-200 p-4 pl-12"
              >
                <span className="absolute left-3 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-fg">
                  {d.day}
                </span>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{d.focus}</p>
                  {d.date && (
                    <span className="text-xs text-slate-400">{d.date}</span>
                  )}
                </div>

                {d.materials.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    📄 {d.materials.join(", ")}
                  </p>
                )}

                {d.tasks.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {d.tasks.map((t, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-slate-400">○</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}

                {d.concepts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.concepts.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
