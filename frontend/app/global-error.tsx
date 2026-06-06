"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-page text-ink antialiased">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
          <span className="text-lg font-bold text-primary">Ilm AI</span>
          <h1 className="mt-6 text-2xl font-bold text-ink">
            Something went wrong
          </h1>
          <p className="mt-2 text-muted-fg">
            Our team has been notified. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 font-semibold text-primary-fg shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
