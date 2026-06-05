/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // Enables instrumentation.ts so Sentry can init on the server/edge runtimes.
    instrumentationHook: true,
  },
};

// Wrap with Sentry only when the package is installed. Keeps builds working before
// `npm install` has pulled @sentry/nextjs, and only uploads source maps when a
// SENTRY_AUTH_TOKEN is present. Runtime error capture is gated on NEXT_PUBLIC_SENTRY_DSN
// inside the sentry.*.config.ts files.
let config = nextConfig;
try {
  const { withSentryConfig } = require("@sentry/nextjs");
  config = withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  });
} catch {
  // @sentry/nextjs not installed — run without it.
}

module.exports = config;
