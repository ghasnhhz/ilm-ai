import * as Sentry from "@sentry/nextjs";

// Browser-side error + performance monitoring. No-op when the DSN is unset, so
// local/dev runs stay quiet.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
