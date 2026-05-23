"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Client-only wrapper around next-auth's SessionProvider so the
 * server-rendered root layout can include it without becoming a
 * client component itself.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
