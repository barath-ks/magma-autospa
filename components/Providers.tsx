"use client";
import { SessionProvider } from "next-auth/react";

/**
 * Wraps the app in next-auth's SessionProvider.
 *
 * We pass `session={null}` as the initial session value so that next-auth treats
 * the session as "already fetched but empty" on the first render (hasInitialSession = true).
 * This prevents the library from making a server-side fetch to /api/auth/session
 * during static prerendering — which would fail on Vercel because the deployment
 * URL (VERCEL_URL) isn't live yet at build time. The client will refresh the
 * session automatically after hydration via useEffect.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider session={null}>{children}</SessionProvider>;
}
