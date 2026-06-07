"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Flame, Trophy } from "lucide-react";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Textarea, Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

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
  const { toast } = useToast();
  const { t } = useT();

  const [me, setMe] = useState<Me | null>(null);
  const [goalText, setGoalText] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
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
    try {
      await apiFetch("/auth/goal", {
        token,
        method: "PUT",
        body: { goal_text: goalText, target_date: targetDate || null },
      });
      await load();
      toast(t("profile.goalSaved"), "success");
    } catch {
      toast(t("profile.goalSaveError"), "error");
    }
    setSaving(false);
  }

  if (status === "loading") {
    return <Loading />;
  }

  const stats = [
    {
      label: t("profile.statsSessions"),
      value: quizStats?.sessions_completed ?? "—",
    },
    { label: t("profile.statsTopics"), value: quizStats?.topics_covered ?? "—" },
    {
      label: t("profile.statsScore"),
      value: quizStats ? `${quizStats.knowledge_score}%` : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">{t("profile.title")}</h1>
        <p className="text-sm text-muted-fg">{t("profile.subtitle")}</p>
      </header>

      <Card>
        <p className="text-lg font-semibold text-ink">
          {me?.name || t("profile.learner")}
        </p>
        <p className="text-sm text-muted-fg">{me?.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-fg">
          {t("profile.accountSuffix", { provider: me?.provider ?? "" })}
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="mt-1 text-xs text-muted-fg">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>{t("profile.goalTitle")}</CardTitle>
        <p className="mt-1 text-sm text-muted-fg">{t("profile.goalHint")}</p>
        <Textarea
          className="mt-3"
          rows={3}
          placeholder={t("profile.goalPlaceholder")}
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
        />
        <Field label={t("profile.targetDate")} className="mt-3">
          {(props) => (
            <Input
              {...props}
              type="date"
              value={targetDate ?? ""}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          )}
        </Field>
        <div className="mt-3">
          <Button onClick={saveGoal} loading={saving} disabled={!goalText.trim()}>
            {t("profile.saveGoal")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("profile.telegram")}</CardTitle>
        {telegram?.linked ? (
          <div className="mt-3 space-y-2 text-sm text-muted-fg">
            <p className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t("profile.connected")}
            </p>
            <p className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" aria-hidden="true" />
              {t("profile.currentStreak", { days: telegram.current_streak })}
            </p>
            <p className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" aria-hidden="true" />
              {t("profile.longestStreak", { days: telegram.longest_streak })}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {telegram.reminder
                ? t("profile.reminderAt", {
                    time: `${String(telegram.reminder.hour).padStart(2, "0")}:${String(
                      telegram.reminder.minute,
                    ).padStart(2, "0")}`,
                  })
                : t("profile.noReminder")}
            </p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-muted-fg">{t("profile.telegramPitch")}</p>
            {linkUrl ? (
              <Button
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3"
              >
                {t("profile.openTelegram")}
              </Button>
            ) : (
              <Button variant="secondary" className="mt-3" onClick={connectTelegram}>
                {t("profile.connectTelegram")}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
