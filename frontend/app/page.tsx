import Link from "next/link";

const features = [
  {
    title: "Your materials, your tutor",
    body: "Upload PDFs, docs, or notes. Ilm AI answers only from what you bring — and cites the exact section.",
  },
  {
    title: "Practice that adapts",
    body: "Quizzes at the depth you choose, with explanations that point back to your source material.",
  },
  {
    title: "Know your gaps",
    body: "After a few sessions, see exactly what you've mastered and what still needs work.",
  },
  {
    title: "A plan that fits your life",
    body: "Set a goal and a date. Get a day-by-day plan mapped to your own documents.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10 sm:max-w-3xl">
      <header className="flex items-center justify-between">
        <span className="text-lg font-bold text-brand">Ilm AI</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/login" className="text-slate-600 hover:text-brand">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-fg"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mt-16 flex flex-col gap-5">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          A patient tutor for whatever you&apos;re learning.
        </h1>
        <p className="text-base text-slate-600 sm:text-lg">
          You bring the material — a textbook chapter, a transcript, a research
          paper, your own notes — and Ilm AI becomes the tutor for it.
        </p>
        <Link
          href="/signup"
          className="w-full rounded-lg bg-brand px-5 py-3 text-center font-semibold text-brand-fg sm:w-fit"
        >
          Start learning free
        </Link>
      </section>

      <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto pt-16 text-center text-xs text-slate-400">
        Ilm AI — because learning is not a phase of life. It is life.
      </footer>
    </main>
  );
}
