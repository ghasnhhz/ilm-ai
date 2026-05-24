"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";

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

const DIFFICULTIES = [
  { value: "gentle", label: "Gentle", desc: "Definitions and key facts" },
  { value: "solid", label: "Solid", desc: "Mechanisms and relationships" },
  { value: "expert", label: "Expert", desc: "Application and analysis" },
];

export default function QuizPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

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
  const [selectedOption, setSelectedOption] = useState<string>("");
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
      });
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setFeedback(null);
      setSelectedOption("");
      setShortAnswer("");
      setPhase("questions");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Failed to generate questions. Make sure you have uploaded study materials.",
      );
    }
    setGenerating(false);
  }, [token, collectionId, difficulty, nQuestions]);

  const submitAnswer = useCallback(async () => {
    const q = questions[currentIdx];
    if (!token || !q) return;
    const userAnswer = q.question_type === "mc" ? selectedOption : shortAnswer;
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
      setError(e instanceof ApiError ? e.message : "Failed to submit answer.");
    }
    setSubmitting(false);
  }, [token, questions, currentIdx, selectedOption, shortAnswer]);

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
      setSelectedOption("");
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
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quiz</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/chat" className="text-slate-500 hover:text-brand">
            Companion
          </Link>
          <Link href="/library" className="text-slate-500 hover:text-brand">
            Library
          </Link>
        </div>
      </header>

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
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
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
    </main>
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
  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Collection</h2>
        <p className="mt-1 text-sm text-slate-500">
          Quiz from all your materials, or pick a specific collection.
        </p>
        <select
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
        >
          <option value="">All materials</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Difficulty</h2>
        <div className="mt-3 flex gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                difficulty === d.value
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-slate-200 text-slate-600 hover:border-brand"
              }`}
            >
              <p className="font-semibold">{d.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{d.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Number of questions</h2>
        <div className="mt-3 flex items-center gap-3">
          {[3, 5, 7, 10].map((n) => (
            <button
              key={n}
              onClick={() => setNQuestions(n)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                nQuestions === n
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-slate-200 text-slate-600 hover:border-brand"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={onStart}
        disabled={generating}
        className="w-full rounded-xl bg-brand py-3 font-semibold text-brand-fg disabled:opacity-60"
      >
        {generating ? "Generating questions…" : "Start quiz"}
      </button>
    </div>
  );
}

function QuestionPhase({
  questions,
  currentIdx,
  selectedOption,
  setSelectedOption,
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
  selectedOption: string;
  setSelectedOption: (v: string) => void;
  shortAnswer: string;
  setShortAnswer: (v: string) => void;
  feedback: QuizAnswerOut | null;
  submitting: boolean;
  onSubmit: () => void;
  onNext: () => void;
  error: string | null;
}) {
  const q = questions[currentIdx];
  const total = questions.length;
  const progress = ((currentIdx + (feedback ? 1 : 0)) / total) * 100;
  const isLast = currentIdx === total - 1;

  return (
    <div className="mt-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {currentIdx + 1} of {total}
        </span>
        {q.concept && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{q.concept}</span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-brand transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="mt-5 rounded-xl border border-slate-200 p-5">
        <p className="font-medium leading-relaxed">{q.prompt}</p>

        {q.question_type === "mc" && !feedback && (
          <div className="mt-4 space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedOption(opt[0])}
                className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                  selectedOption === opt[0]
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-slate-200 text-slate-700 hover:border-brand"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.question_type === "short" && !feedback && (
          <textarea
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            rows={3}
            placeholder="Type your answer…"
            value={shortAnswer}
            onChange={(e) => setShortAnswer(e.target.value)}
          />
        )}

        {feedback && (
          <div
            className={`mt-4 rounded-lg border p-4 ${
              feedback.is_correct
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p
              className={`font-semibold ${feedback.is_correct ? "text-green-700" : "text-red-700"}`}
            >
              {feedback.is_correct ? "Correct!" : "Incorrect"}
            </p>
            {!feedback.is_correct && (
              <p className="mt-1 text-sm text-slate-700">
                Correct answer: <strong>{feedback.correct_answer}</strong>
              </p>
            )}
            {feedback.explanation && (
              <p className="mt-1 text-sm text-slate-600">{feedback.explanation}</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        {!feedback ? (
          <button
            onClick={onSubmit}
            disabled={
              submitting ||
              (q.question_type === "mc" ? !selectedOption : !shortAnswer.trim())
            }
            className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-brand-fg disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Submit"}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-brand-fg"
          >
            {isLast ? "See results" : "Next question"}
          </button>
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

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-slate-200 p-6 text-center">
        <p className="text-5xl font-bold text-brand">{pct}%</p>
        <p className="mt-2 text-lg font-semibold">
          {results.score} / {results.total} correct
        </p>
        <p className="mt-1 text-sm capitalize text-slate-500">{results.difficulty} difficulty</p>
      </div>

      <div className="mt-5 space-y-2">
        {results.answers.map((a, i) => (
          <div key={a.question_id} className="rounded-xl border border-slate-200">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setExpanded(expanded === a.question_id ? null : a.question_id)}
            >
              <span className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-block h-5 w-5 rounded-full text-center text-xs font-bold leading-5 ${
                    a.is_correct === true
                      ? "bg-green-100 text-green-700"
                      : a.is_correct === false
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {a.is_correct === true ? "✓" : a.is_correct === false ? "✗" : "—"}
                </span>
                Q{i + 1}: {a.prompt.length > 60 ? a.prompt.slice(0, 60) + "…" : a.prompt}
              </span>
              <span className="ml-2 text-xs text-slate-400">{expanded === a.question_id ? "▲" : "▼"}</span>
            </button>
            {expanded === a.question_id && (
              <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <p>
                  <strong>Your answer:</strong> {a.user_answer ?? "—"}
                </p>
                <p className="mt-1">
                  <strong>Correct answer:</strong> {a.correct_answer}
                </p>
                {a.explanation && (
                  <p className="mt-1 text-slate-500">{a.explanation}</p>
                )}
                {a.concept && (
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {a.concept}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onTryAgain}
        className="mt-6 w-full rounded-xl border border-brand py-3 font-semibold text-brand hover:bg-brand/5"
      >
        Try again
      </button>
    </div>
  );
}
