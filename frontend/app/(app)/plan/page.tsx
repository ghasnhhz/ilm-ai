"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Circle, FileText } from "lucide-react";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";

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
  const { t } = useT();

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
      setError(t("plan.loadError"));
    }
    setLoading(false);
  }, [token, t]);

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
        timeoutMs: 120_000, // the plan agent makes multiple LLM tool calls
      });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : t("plan.generateError"),
      );
    }
    setGenerating(false);
  }, [token, t]);

  if (status === "loading") {
    return <Loading />;
  }

  const plan = data?.plan ?? null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{t("plan.title")}</h1>

      {loading && (
        <div className="mt-6">
          <Loading label={t("plan.loading")} />
        </div>
      )}
      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {!loading && !plan && (
        <EmptyState
          className="mt-8"
          icon={CalendarDays}
          title={t("plan.emptyTitle")}
          body={t("plan.emptyBody")}
          action={
            <div className="flex flex-col items-center gap-3">
              <Button onClick={generate} loading={generating}>
                {t("plan.generate")}
              </Button>
              <Link href="/profile" className="text-sm text-primary underline">
                {t("plan.setGoal")}
              </Link>
            </div>
          }
        />
      )}

      {!loading && plan && (
        <div className="mt-6">
          {data?.stale && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-warn/30 bg-warn/5 p-4">
              <p className="text-sm text-warn">{t("plan.staleWarning")}</p>
              <Button
                size="sm"
                className="shrink-0"
                onClick={generate}
                loading={generating}
              >
                {t("plan.regenerate")}
              </Button>
            </div>
          )}

          <Card>
            <p className="text-ink">{plan.summary}</p>
            {data?.target_date && (
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-fg">
                {t("plan.target", { date: data.target_date })}
              </p>
            )}
            {!data?.stale && (
              <button
                onClick={generate}
                disabled={generating}
                className="mt-3 text-sm font-semibold text-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {generating ? t("plan.regenerating") : t("plan.regeneratePlan")}
              </button>
            )}
          </Card>

          {/* Timeline */}
          <ol className="mt-5 space-y-3">
            {plan.days.map((d) => (
              <li key={d.day} className="relative rounded-md border border-hairline bg-surface p-4 pl-12 shadow-sm">
                <span className="absolute left-3 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">
                  {d.day}
                </span>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{d.focus}</p>
                  {d.date && (
                    <span className="text-xs text-muted-fg">{d.date}</span>
                  )}
                </div>

                {d.materials.length > 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-fg">
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {d.materials.join(", ")}
                  </p>
                )}

                {d.tasks.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {d.tasks.map((t, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink">
                        <Circle
                          className="mt-1.5 h-2 w-2 shrink-0 text-muted-fg"
                          aria-hidden="true"
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                )}

                {d.concepts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.concepts.map((c) => (
                      <Badge key={c}>{c}</Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
