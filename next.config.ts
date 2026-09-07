import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure NEXTAUTH_URL is always a valid URL at build time.
  // Vercel provides VERCEL_URL (no protocol) as a system env var during build;
  // we fall back to localhost for local dev. This prevents next-auth's
  // module-level parseUrl() from receiving an empty/undefined value and throwing
  // "TypeError: Invalid URL" during static page prerendering.
  env: {
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  },
};

export default nextConfig;
