import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog (EU) reverse proxy. Keeps analytics requests on our origin so
  // ad blockers don't drop them. The /static and /array prefixes must go
  // to the assets host; everything else to the ingest host.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // Required so /ingest/decide etc. don't get redirected.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
