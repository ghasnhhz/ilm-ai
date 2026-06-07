"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";

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
  const { t } = useT();

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
      setError(t("gaps.loadError"));
    }
    setLoading(false);
  }, [token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return <Loading />;
  }

  const isEmpty =
    report &&
    report.strong.length === 0 &&
    report.gaps.length === 0 &&
    report.suggested_sections.length === 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{t("gaps.title")}</h1>
      <p className="mt-1 text-sm text-muted-fg">{t("gaps.subtitle")}</p>

      {loading && (
        <div className="mt-6">
          <Loading label={t("gaps.loading")} />
        </div>
      )}
      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {report && isEmpty && !loading && (
        <EmptyState
          className="mt-8"
          icon={Target}
          title={t("gaps.emptyTitle")}
          body={t("gaps.emptyBody")}
          action={<Button href="/quiz">{t("gaps.startQuiz")}</Button>}
        />
      )}

      {report && !isEmpty && !loading && (
        <div className="mt-6 space-y-6">
          {/* Needs work */}
          {report.gaps.length > 0 && (
            <section>
              <h2 className="font-semibold text-warn">{t("gaps.needsWork")}</h2>
              <div className="mt-3 space-y-2">
                {report.gaps.map((g) => (
                  <div
                    key={g.concept}
                    className="rounded-md border border-warn/30 bg-warn/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-ink">{g.concept}</p>
                      <Badge variant="warn">
                        {t("gaps.missedSessions", {
                          wrong: g.wrong_count,
                          sessions: g.sessions,
                        })}
                      </Badge>
                    </div>
                    {g.materials.length > 0 && (
                      <p className="mt-1 text-xs text-muted-fg">
                        {t("gaps.from", { materials: g.materials.join(", ") })}
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
              <h2 className="font-semibold text-success">{t("gaps.knowWell")}</h2>
              <div className="mt-3 space-y-2">
                {report.strong.map((s) => (
                  <div
                    key={s.concept}
                    className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/5 p-4"
                  >
                    <p className="font-medium text-ink">{s.concept}</p>
                    <Badge variant="success">
                      {t("gaps.accuracyStat", {
                        accuracy: s.accuracy,
                        correct: s.correct,
                        total: s.total,
                      })}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Revisit these materials */}
          {report.suggested_sections.length > 0 && (
            <section>
              <h2 className="font-semibold text-ink">{t("gaps.revisit")}</h2>
              <div className="mt-3 space-y-2">
                {report.suggested_sections.map((sec) => (
                  <Link
                    key={sec.material_id}
                    href="/library"
                    className="block focus-visible:outline-none"
                  >
                    <Card className="p-4 transition-colors hover:border-primary">
                      <p className="font-medium text-ink">{sec.title}</p>
                      <p className="mt-0.5 text-xs text-muted-fg">
                        {t("gaps.covers", { concepts: sec.concepts.join(", ") })}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
