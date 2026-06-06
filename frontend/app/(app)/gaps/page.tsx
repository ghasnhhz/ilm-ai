"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";

type ConceptStat = {
  concept: string;
  total: number;
  correct: number;
  accuracy: number;
};

type GapItem = {
  concept: string;
  wrong_count: number;
  sessions: number;
  materials: string[];
};

type SuggestedSection = {
  material_id: string;
  title: string;
  concepts: string[];
};

type GapsReport = {
  strong: ConceptStat[];
  gaps: GapItem[];
  suggested_sections: SuggestedSection[];
};

export default function GapsPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [report, setReport] = useState<GapsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GapsReport>("/gaps", { token });
      setReport(data);
    } catch {
      setError("Could not load your gaps report.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  const isEmpty =
    report &&
    report.strong.length === 0 &&
    report.gaps.length === 0 &&
    report.suggested_sections.length === 0;

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Knowledge gaps</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/quiz" className="text-slate-500 hover:text-brand">
            Quiz
          </Link>
          <Link href="/plan" className="text-slate-500 hover:text-brand">
            Plan
          </Link>
          <Link href="/chat" className="text-slate-500 hover:text-brand">
            Companion
          </Link>
          <Link href="/library" className="text-slate-500 hover:text-brand">
            Library
          </Link>
        </div>
      </header>

      <p className="mt-2 text-sm text-slate-500">
        Based on every quiz you&apos;ve taken — updates as you practice more.
      </p>

      {loading && <p className="mt-6 text-slate-500">Loading your report…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {report && isEmpty && !loading && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-semibold text-slate-700">No gaps to show yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Take a few quizzes and your strengths and weak spots will appear here.
          </p>
          <Link
            href="/quiz"
            className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 font-semibold text-brand-fg"
          >
            Start a quiz
          </Link>
        </div>
      )}

      {report && !isEmpty && !loading && (
        <div className="mt-6 space-y-6">
          {/* Needs work */}
          {report.gaps.length > 0 && (
            <section>
              <h2 className="font-semibold text-amber-700">Needs work</h2>
              <div className="mt-3 space-y-2">
                {report.gaps.map((g) => (
                  <div
                    key={g.concept}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-800">{g.concept}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {g.wrong_count} missed · {g.sessions} sessions
                      </span>
                    </div>
                    {g.materials.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        From: {g.materials.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* What you know well */}
          {report.strong.length > 0 && (
            <section>
              <h2 className="font-semibold text-green-700">What you know well</h2>
              <div className="mt-3 space-y-2">
                {report.strong.map((s) => (
                  <div
                    key={s.concept}
                    className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4"
                  >
                    <p className="font-medium text-slate-800">{s.concept}</p>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      {s.accuracy}% · {s.correct}/{s.total}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Revisit these materials */}
          {report.suggested_sections.length > 0 && (
            <section>
              <h2 className="font-semibold">Revisit these materials</h2>
              <div className="mt-3 space-y-2">
                {report.suggested_sections.map((sec) => (
                  <Link
                    key={sec.material_id}
                    href="/library"
                    className="block rounded-xl border border-slate-200 p-4 hover:border-brand"
                  >
                    <p className="font-medium text-slate-800">{sec.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Covers: {sec.concepts.join(", ")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
