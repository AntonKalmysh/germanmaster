// Client-side PostHog initialization. Picked up automatically by Next.js
// at the project root (Next 15.3+).
//
// Routes through the /ingest reverse proxy configured in next.config.ts so
// requests aren't filtered by ad blockers. The proxy maps to the EU region.

import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
} else if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.warn(
    "[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN not set; analytics disabled.",
  );
}
