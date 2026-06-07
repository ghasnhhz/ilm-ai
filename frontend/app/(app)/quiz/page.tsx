"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";
import { Loading } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Collection = { id: string; name: string };

type QuizQuestion = {
  id: string;
  session_id: string;
  question_type: "mc" | "short";
  prompt: string;
  options: string[];
  concept: string;
};

type QuizGenerateResponse = {
  session_id: string;
  questions: QuizQuestion[];
};

type QuizAnswerOut = {
  is_correct: boolean;
  explanation: string;
  correct_answer: string;
};

type AnswerDetail = {
  question_id: string;
  prompt: string;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean | null;
  explanation: string | null;
  concept: string;
};

type QuizResultsOut = {
  session_id: string;
  score: number;
  total: number;
  difficulty: string;
  answers: AnswerDetail[];
};

type Phase = "setup" | "questions" | "results";

// MC options are sent to the backend as a letter (A, B, C, …) derived from the
// option's position, so selection never depends on the option text being prefixed.
const optionLetter = (idx: number) => String.fromCharCode(65 + idx);

const DIFFICULTIES = [
  {
    value: "gentle",
    labelKey: "quiz.difficulty.gentle",
    descKey: "quiz.difficulty.gentleDesc",
  },
  {
    value: "solid",
    labelKey: "quiz.difficulty.solid",
    descKey: "quiz.difficulty.solidDesc",
  },
  {
    value: "expert",
    labelKey: "quiz.difficulty.expert",
    descKey: "quiz.difficulty.expertDesc",
  },
] as const;

export default function QuizPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const { t } = useT();

  const [phase, setPhase] = useState<Phase>("setup");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("");
  const [difficulty, setDifficulty] = useState("solid");
  const [nQuestions, setNQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  // Track the chosen option by index (not by parsing the option text). The backend
  // grades MC answers by letter (A/B/C/D), which we derive from the index below.
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<QuizAnswerOut | null>(null);

  const [results, setResults] = useState<QuizResultsOut | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Collection[]>("/collections", { token }).then(setCollections).catch(() => {});
  }, [token]);

  const startQuiz = useCallback(async () => {
    if (!token) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await apiFetch<QuizGenerateResponse>("/quiz/generate", {
        token,
        method: "POST",
        body: {
          collection_id: collectionId || null,
          difficulty,
          n_questions: nQuestions,
        },
        timeoutMs: 90_000, // generation calls the LLM and can run long
      });
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setFeedback(null);
      setSelectedIdx(null);
      setShortAnswer("");
      setPhase("questions");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : t("quiz.generateError"),
      );
    }
    setGenerating(false);
  }, [token, collectionId, difficulty, nQuestions, t]);

  const submitAnswer = useCallback(async () => {
    const q = questions[currentIdx];
    if (!token || !q) return;
    const userAnswer =
      q.question_type === "mc"
        ? selectedIdx === null
          ? ""
          : optionLetter(selectedIdx)
        : shortAnswer;
    if (!userAnswer.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const fb = await apiFetch<QuizAnswerOut>("/quiz/answer", {
        token,
        method: "POST",
        body: { question_id: q.id, user_answer: userAnswer },
      });
      setFeedback(fb);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("quiz.answerError"));
    }
    setSubmitting(false);
  }, [token, questions, currentIdx, selectedIdx, shortAnswer, t]);

  const nextQuestion = useCallback(async () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      // Fetch results
      if (!token || !sessionId) return;
      try {
        const r = await apiFetch<QuizResultsOut>(`/quiz/results/${sessionId}`, { token });
        setResults(r);
        setPhase("results");
      } catch {
        setPhase("results");
      }
    } else {
      setCurrentIdx(nextIdx);
      setFeedback(null);
      setSelectedIdx(null);
      setShortAnswer("");
    }
  }, [currentIdx, questions.length, token, sessionId]);

  const tryAgain = () => {
    setPhase("setup");
    setSessionId(null);
    setQuestions([]);
    setResults(null);
    setFeedback(null);
    setError(null);
  };

  if (status === "loading") {
    return <Loading />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{t("quiz.title")}</h1>

      {phase === "setup" && (
        <SetupPhase
          collections={collections}
          collectionId={collectionId}
          setCollectionId={setCollectionId}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          nQuestions={nQuestions}
          setNQuestions={setNQuestions}
          onStart={startQuiz}
          generating={generating}
          error={error}
        />
      )}

      {phase === "questions" && questions.length > 0 && (
        <QuestionPhase
          questions={questions}
          currentIdx={currentIdx}
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          shortAnswer={shortAnswer}
          setShortAnswer={setShortAnswer}
          feedback={feedback}
          submitting={submitting}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
          error={error}
        />
      )}

      {phase === "results" && results && (
        <ResultsPhase results={results} onTryAgain={tryAgain} />
      )}
    </div>
  );
}

function SetupPhase({
  collections,
  collectionId,
  setCollectionId,
  difficulty,
  setDifficulty,
  nQuestions,
  setNQuestions,
  onStart,
  generating,
  error,
}: {
  collections: Collection[];
  collectionId: string;
  setCollectionId: (v: string) => void;
  difficulty: string;
  setDifficulty: (v: string) => void;
  nQuestions: number;
  setNQuestions: (v: number) => void;
  onStart: () => void;
  generating: boolean;
  error: string | null;
}) {
  const { t } = useT();
  return (
    <div className="mt-6 space-y-5">
      <Card>
        <CardTitle>{t("quiz.collection")}</CardTitle>
        <p className="mt-1 text-sm text-muted-fg">{t("quiz.collectionHint")}</p>
        <Select
          className="mt-3"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
        >
          <option value="">{t("quiz.allMaterials")}</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Card>

      <Card>
        <CardTitle>{t("quiz.difficulty")}</CardTitle>
        <div className="mt-3 flex gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              aria-pressed={difficulty === d.value}
              className={cn(
                "flex-1 rounded-md border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                difficulty === d.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-hairline text-muted-fg hover:border-primary",
              )}
            >
              <p className="font-semibold">{t(d.labelKey)}</p>
              <p className="mt-0.5 text-xs text-muted-fg">{t(d.descKey)}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>{t("quiz.numQuestions")}</CardTitle>
        <div className="mt-3 flex items-center gap-3">
          {[3, 5, 7, 10].map((n) => (
            <button
              key={n}
              onClick={() => setNQuestions(n)}
              aria-pressed={nQuestions === n}
              className={cn(
                "rounded-md border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                nQuestions === n
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-hairline text-muted-fg hover:border-primary",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <div className="text-sm text-danger">
          <p>{error}</p>
          {/Upgrade|premium/i.test(error) && (
            <Link href="/pricing" className="font-semibold text-primary underline">
              {t("quiz.viewPricing")}
            </Link>
          )}
        </div>
      )}

      <Button className="w-full" onClick={onStart} loading={generating}>
        {t("quiz.start")}
      </Button>
    </div>
  );
}

function QuestionPhase({
  questions,
  currentIdx,
  selectedIdx,
  setSelectedIdx,
  shortAnswer,
  setShortAnswer,
  feedback,
  submitting,
  onSubmit,
  onNext,
  error,
}: {
  questions: QuizQuestion[];
  currentIdx: number;
  selectedIdx: number | null;
  setSelectedIdx: (v: number | null) => void;
  shortAnswer: string;
  setShortAnswer: (v: string) => void;
  feedback: QuizAnswerOut | null;
  submitting: boolean;
  onSubmit: () => void;
  onNext: () => void;
  error: string | null;
}) {
  const { t } = useT();
  const q = questions[currentIdx];
  const total = questions.length;
  const progress = ((currentIdx + (feedback ? 1 : 0)) / total) * 100;
  const isLast = currentIdx === total - 1;

  return (
    <div className="mt-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-fg">
        <span>
          {t("quiz.questionOf", { current: currentIdx + 1, total })}
        </span>
        {q.concept && <Badge>{q.concept}</Badge>}
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <Card className="mt-5">
        <p className="font-medium leading-relaxed text-ink">{q.prompt}</p>

        {q.question_type === "mc" && !feedback && (
          <div className="mt-4 space-y-2">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                aria-pressed={selectedIdx === idx}
                className={cn(
                  "w-full rounded-md border px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selectedIdx === idx
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-hairline text-ink hover:border-primary",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.question_type === "short" && !feedback && (
          <Textarea
            className="mt-4"
            rows={3}
            placeholder={t("quiz.typeAnswer")}
            value={shortAnswer}
            onChange={(e) => setShortAnswer(e.target.value)}
          />
        )}

        {feedback && (
          <div
            className={cn(
              "mt-4 rounded-md border p-4",
              feedback.is_correct
                ? "border-success/30 bg-success/5"
                : "border-danger/30 bg-danger/5",
            )}
          >
            <p
              className={cn(
                "font-semibold",
                feedback.is_correct ? "text-success" : "text-danger",
              )}
            >
              {feedback.is_correct ? t("quiz.correct") : t("quiz.incorrect")}
            </p>
            {!feedback.is_correct && (
              <p className="mt-1 text-sm text-ink">
                {t("quiz.correctAnswer")}{" "}
                <strong>{feedback.correct_answer}</strong>
              </p>
            )}
            {feedback.explanation && (
              <p className="mt-1 text-sm text-muted-fg">{feedback.explanation}</p>
            )}
          </div>
        )}
      </Card>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex justify-end">
        {!feedback ? (
          <Button
            size="lg"
            onClick={onSubmit}
            loading={submitting}
            disabled={
              q.question_type === "mc"
                ? selectedIdx === null
                : !shortAnswer.trim()
            }
          >
            {t("quiz.submit")}
          </Button>
        ) : (
          <Button size="lg" onClick={onNext}>
            {isLast ? t("quiz.seeResults") : t("quiz.nextQuestion")}
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultsPhase({
  results,
  onTryAgain,
}: {
  results: QuizResultsOut;
  onTryAgain: () => void;
}) {
  const pct = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;
  const [expanded, setExpanded] = useState<string | null>(null);
  const { t } = useT();

  return (
    <div className="mt-6">
      <Card className="p-6 text-center">
        <p className="text-5xl font-bold text-primary">{pct}%</p>
        <p className="mt-2 text-lg font-semibold text-ink">
          {t("quiz.scoreCorrect", { score: results.score, total: results.total })}
        </p>
        <p className="mt-1 text-sm capitalize text-muted-fg">
          {t("quiz.resultsDifficulty", { difficulty: results.difficulty })}
        </p>
      </Card>

      <div className="mt-5 space-y-2">
        {results.answers.map((a, i) => (
          <Card key={a.question_id} className="p-0">
            <button
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              onClick={() => setExpanded(expanded === a.question_id ? null : a.question_id)}
              aria-expanded={expanded === a.question_id}
            >
              <span className="flex items-center gap-2 text-sm text-ink">
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full text-center text-xs font-bold leading-5",
                    a.is_correct === true
                      ? "bg-success/15 text-success"
                      : a.is_correct === false
                        ? "bg-danger/15 text-danger"
                        : "bg-muted text-muted-fg",
                  )}
                >
                  {a.is_correct === true ? "✓" : a.is_correct === false ? "✗" : "—"}
                </span>
                Q{i + 1}: {a.prompt.length > 60 ? a.prompt.slice(0, 60) + "…" : a.prompt}
              </span>
              <span className="ml-2 text-xs text-muted-fg">
                {expanded === a.question_id ? "▲" : "▼"}
              </span>
            </button>
            {expanded === a.question_id && (
              <div className="border-t border-hairline px-4 py-3 text-sm text-muted-fg">
                <p>
                  <strong className="text-ink">{t("quiz.yourAnswer")}</strong>{" "}
                  {a.user_answer ?? "—"}
                </p>
                <p className="mt-1">
                  <strong className="text-ink">{t("quiz.correctAnswer")}</strong>{" "}
                  {a.correct_answer}
                </p>
                {a.explanation && <p className="mt-1">{a.explanation}</p>}
                {a.concept && (
                  <div className="mt-2">
                    <Badge>{a.concept}</Badge>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Button variant="secondary" className="mt-6 w-full" onClick={onTryAgain}>
        {t("quiz.tryAgain")}
      </Button>
    </div>
  );
}
