/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Pin the file-tracing / dev-watcher root to this folder. Without it, the
  // "standalone" output tracing walks up the directory tree and (on Windows)
  // ends up scanning the drive root D:\, which throws Watchpack EINVAL errors
  // on protected system files like pagefile.sys / DumpStack.log.tmp.
  outputFileTracingRoot: __dirname,
  experimental: {
    // Enables instrumentation.ts so Sentry can init on the server/edge runtimes.
    instrumentationHook: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Defensive: even if the watcher touches the drive root, don't choke on
      // locked Windows system files. webpack's array form for `ignored`
      // requires every entry to be a string glob, and Next's default is a
      // RegExp — so only reuse the existing value when it's already
      // string-based, otherwise fall back to the standard dev ignore globs.
      const existing = config.watchOptions?.ignored;
      const base =
        typeof existing === "string"
          ? [existing]
          : Array.isArray(existing) &&
            existing.every((p) => typeof p === "string")
          ? existing
          : ["**/.git/**", "**/.next/**", "**/node_modules/**"];
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...base,
          "D:/pagefile.sys",
          "D:/swapfile.sys",
          "D:/hiberfil.sys",
          "D:/DumpStack.log.tmp",
        ],
      };
    }
    return config;
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
