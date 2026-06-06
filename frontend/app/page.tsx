import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  GraduationCap,
  Languages,
  ListChecks,
  Lock,
  MessagesSquare,
  Stethoscope,
  TrendingUp,
  Upload,
  type LucideIcon,
} from "lucide-react";

// Concrete personas from the brief — show, don't list. The visitor should feel
// "this is for me" rather than read a feature checklist.
const personas: { icon: LucideIcon; who: string; line: string }[] = [
  {
    icon: GraduationCap,
    who: "The exam candidate",
    line: "Drowning in past papers and a syllabus PDF. Needs to actually retain it before the entrance exam.",
  },
  {
    icon: TrendingUp,
    who: "The career-switcher",
    line: "Teaching themselves data science from a course transcript and scattered articles, after work.",
  },
  {
    icon: Stethoscope,
    who: "The busy professional",
    line: "A doctor reviewing updated protocols — no time to reread 90 pages, needs the parts that matter.",
  },
  {
    icon: Languages,
    who: "The lifelong learner",
    line: "A parent learning a new language from their own notes, at their own pace, in their own words.",
  },
];

// A short, scannable "how it works" — four steps, not a wall of features.
const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Upload,
    title: "Bring your material",
    body: "Upload PDFs, docs, or notes. Ilm AI reads and organises them into your private library.",
  },
  {
    icon: MessagesSquare,
    title: "Learn with the companion",
    body: "Ask anything. It answers only from your material — and cites the exact section it used.",
  },
  {
    icon: ListChecks,
    title: "Quiz yourself",
    body: "Practice at the depth you choose. Every answer comes with an explanation and its source.",
  },
  {
    icon: CalendarDays,
    title: "Get a plan",
    body: "See your gaps, set a goal and a date, and get a day-by-day plan mapped to your own documents.",
  },
];

// Trust signals — the brief asks us to build trust explicitly.
const trust: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Lock,
    title: "Private by default",
    body: "Your materials are yours. No one else can see what you upload or study.",
  },
  {
    icon: BookMarked,
    title: "Always cites the source",
    body: "Every answer points back to the exact section it came from — no made-up facts.",
  },
  {
    icon: Languages,
    title: "Speaks your language",
    body: "Works naturally in Uzbek, Russian, and English.",
  },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page";

function PrimaryCta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-fg shadow-sm transition-colors hover:bg-primary-hover ${focusRing} ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header — wordmark + one primary action, repeated everywhere else too. */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="text-lg font-bold text-primary">Ilm AI</span>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <Link
            href="/login"
            className={`rounded-md px-3 py-1.5 font-medium text-muted-fg transition-colors hover:text-ink ${focusRing}`}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={`rounded-md bg-primary px-4 py-1.5 font-medium text-primary-fg transition-colors hover:bg-primary-hover ${focusRing}`}
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        {/* Hero — lead with the problem, not the features. */}
        <section className="animate-fade-in-up py-12 sm:py-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent">
            A patient tutor for your own material
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            You don&apos;t need more material. You need to actually learn it.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-fg">
            Textbook chapters, course transcripts, research papers, your own
            notes — it piles up faster than anyone can absorb it. Ilm AI turns
            whatever you already have into a patient companion that teaches you,
            quizzes you, finds your gaps, and builds a plan around it.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <PrimaryCta href="/signup" className="w-full sm:w-fit">
              Start learning free
            </PrimaryCta>
            <span className="text-sm text-muted-fg">
              Private · cites the exact section · Uzbek, Russian &amp; English
            </span>
          </div>
        </section>

        {/* Personas — make it tangible. */}
        <section className="border-t border-hairline py-12 sm:py-16">
          <h2 className="text-2xl font-bold text-ink">
            Built for whatever you&apos;re trying to learn
          </h2>
          <p className="mt-2 max-w-2xl text-muted-fg">
            Different goals, the same problem: you have the material, but
            retaining and applying it is the hard part.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {personas.map(({ icon: Icon, who, line }) => (
              <div
                key={who}
                className="rounded-lg border border-hairline bg-surface p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{who}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-fg">
                  {line}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works — four scannable steps. */}
        <section className="border-t border-hairline py-12 sm:py-16">
          <h2 className="text-2xl font-bold text-ink">How it works</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
                    {i + 1}
                  </span>
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-fg">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust band. */}
        <section className="border-t border-hairline py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {trust.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3">
                <Icon
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-fg">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA — repeat the single primary action. */}
        <section className="border-t border-hairline py-16 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight text-ink">
            Start with the material you already have.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-fg">
            Upload one document and meet your tutor in a couple of minutes. Free
            to start.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryCta href="/signup">Start learning free</PrimaryCta>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-5xl px-5 py-8 text-center text-sm text-muted-fg">
          Ilm AI — because learning is not a phase of life. It is life.
        </div>
      </footer>
    </div>
  );
}
