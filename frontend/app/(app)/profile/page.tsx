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
      toast("Goal saved", "success");
    } catch {
      toast("Could not save goal", "error");
    }
    setSaving(false);
  }

  if (status === "loading") {
    return <Loading />;
  }

  const stats = [
    { label: "Sessions completed", value: quizStats?.sessions_completed ?? "—" },
    { label: "Topics covered", value: quizStats?.topics_covered ?? "—" },
    {
      label: "Knowledge score",
      value: quizStats ? `${quizStats.knowledge_score}%` : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Your profile</h1>

      <Card>
        <p className="text-lg font-semibold text-ink">{me?.name || "Learner"}</p>
        <p className="text-sm text-muted-fg">{me?.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-fg">
          {me?.provider} account
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-xl font-bold text-primary">{s.value}</p>
            <p className="mt-1 text-xs text-muted-fg">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Your learning goal</CardTitle>
        <p className="mt-1 text-sm text-muted-fg">
          What do you want to achieve, and by when?
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          placeholder="e.g. Understand cloud architecture well enough to pass the AWS exam"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
        />
        <Field label="Target date" className="mt-3">
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
            Save goal
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Telegram</CardTitle>
        {telegram?.linked ? (
          <div className="mt-3 space-y-2 text-sm text-muted-fg">
            <p className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Connected
            </p>
            <p className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" aria-hidden="true" />
              Current streak: {telegram.current_streak} day(s)
            </p>
            <p className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" aria-hidden="true" />
              Longest streak: {telegram.longest_streak} day(s)
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {telegram.reminder
                ? `Daily reminder at ${String(telegram.reminder.hour).padStart(2, "0")}:${String(
                    telegram.reminder.minute,
                  ).padStart(2, "0")} (set it in the bot with /reminder)`
                : "No reminder set — message the bot /reminder HH:MM"}
            </p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-muted-fg">
              Link Telegram to quiz yourself, get daily reminders, and build a
              streak — without opening the app.
            </p>
            {linkUrl ? (
              <Button
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3"
              >
                Open in Telegram to finish linking
              </Button>
            ) : (
              <Button variant="secondary" className="mt-3" onClick={connectTelegram}>
                Connect Telegram
              </Button>
            )}
          </div>
        )}
      </Card>

      <div className="pt-2">
        <Button href="/billing" variant="ghost" size="sm">
          Billing &amp; subscription
        </Button>
      </div>
    </div>
  );
}
