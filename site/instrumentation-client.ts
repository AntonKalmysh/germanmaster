// Client-side PostHog initialization. Picked up automatically by Next.js
// at the project root (Next 15.3+).
//
// Routes through the /ingest reverse proxy configured in next.config.ts so
// requests aren't filtered by ad blockers. The proxy maps to the EU region.

import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const isProd = process.env.NODE_ENV === "production";

// TEMP DIAGNOSTIC: unconditional boot log. Confirms in ANY environment whether
// this file runs and whether the token was inlined at build time. Remove once
// production analytics is verified working.
// eslint-disable-next-line no-console
console.info(
  `[posthog] instrumentation-client loaded — env=${process.env.NODE_ENV}, tokenPresent=${Boolean(token)}`,
);

if (token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    disable_session_recording: !isProd, // don't film dev/localhost sessions
    debug: !isProd,
  });
} else {
  // Now fires in production too, so a missing token announces itself instead
  // of failing silently.
  // eslint-disable-next-line no-console
  console.warn(
    "[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN not set at build time; analytics disabled. " +
      "If this is production, the variable is missing from the build environment.",
  );
}
