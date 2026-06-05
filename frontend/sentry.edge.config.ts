import * as Sentry from "@sentry/nextjs";

// Edge-runtime (middleware) error monitoring. No-op when the DSN is unset.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
