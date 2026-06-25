"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    // Re-fetch every 5 minutes (and on window focus) so an active session's JWT
    // is rotated before its 15-minute idle window lapses. See session.maxAge /
    // updateAge in src/lib/auth.ts.
    <NextAuthSessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      {children}
    </NextAuthSessionProvider>
  );
}
