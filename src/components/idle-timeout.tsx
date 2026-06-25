"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

/**
 * Signs the user out after a period of inactivity. Activity is any mouse,
 * keyboard, scroll or touch interaction; the last-activity timestamp is shared
 * across tabs via localStorage, so working in one tab keeps the others alive and
 * the whole session expires together. Mounted in every authenticated layout
 * (admin, client portal, advisor, verification).
 *
 * This is the user-facing logout. NextAuth's own token lifetime remains the
 * server-side backstop for a token that is never presented to the browser.
 */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const CHECK_INTERVAL_MS = 30 * 1000;
const STORAGE_KEY = "pc:last-activity";

export function IdleTimeout({ timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number }) {
  const signingOut = useRef(false);

  useEffect(() => {
    const now = () => Date.now();

    const markActive = () => {
      try {
        localStorage.setItem(STORAGE_KEY, String(now()));
      } catch {
        // localStorage may be unavailable (private mode) — fail open.
      }
    };

    const lastActive = () => {
      try {
        const stored = Number(localStorage.getItem(STORAGE_KEY));
        return Number.isFinite(stored) && stored > 0 ? stored : now();
      } catch {
        return now();
      }
    };

    const logout = () => {
      if (signingOut.current) return;
      signingOut.current = true;
      signOut({ callbackUrl: "/login?timeout=1" });
    };

    const check = () => {
      if (now() - lastActive() >= timeoutMs) logout();
    };

    // Seed the timestamp for this session and start watching.
    markActive();

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((e) =>
      window.addEventListener(e, markActive, { passive: true })
    );

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    // Returning to a backgrounded tab should re-check immediately.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    return () => {
      activityEvents.forEach((e) => window.removeEventListener(e, markActive));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [timeoutMs]);

  return null;
}
