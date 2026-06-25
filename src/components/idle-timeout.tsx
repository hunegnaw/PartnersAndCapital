"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Automatically logs the user out after a period of inactivity and sends them to
 * the login page with an "automatically logged out" notice. Activity is any
 * mouse, keyboard, scroll or touch interaction.
 *
 * The last-activity time is held in memory (reliable even when localStorage is
 * blocked, e.g. private mode) and ALSO mirrored to localStorage purely to sync
 * across tabs — activity in one tab keeps the others alive, and the whole
 * session lapses together. Mounted in every authenticated layout (admin, client
 * portal, advisor, verification).
 */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const CHECK_INTERVAL_MS = 15 * 1000;
const STORAGE_KEY = "pc:last-activity";
const LOGOUT_URL = "/login?timeout=1";

export function IdleTimeout({ timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number }) {
  const { status } = useSession();
  const signingOut = useRef(false);
  // In-memory source of truth — does NOT depend on localStorage being writable.
  // Seeded by markActive() when the effect mounts (avoids an impure render call).
  const lastActivityRef = useRef(0);

  // Safety net: if the session ever becomes unauthenticated (e.g. the server
  // token expired while the tab was closed or asleep), bounce to login at once.
  useEffect(() => {
    if (status === "unauthenticated" && !signingOut.current) {
      signingOut.current = true;
      window.location.href = LOGOUT_URL;
    }
  }, [status]);

  useEffect(() => {
    const now = () => Date.now();

    const forceLogout = () => {
      if (signingOut.current) return;
      signingOut.current = true;
      // Clear the session cookie, then hard-redirect to login regardless of how
      // signOut resolves (don't rely on its own redirect, which targets pages.signOut).
      signOut({ redirect: false })
        .catch(() => {})
        .finally(() => {
          window.location.href = LOGOUT_URL;
        });
    };

    const markActive = () => {
      const t = now();
      lastActivityRef.current = t;
      try {
        localStorage.setItem(STORAGE_KEY, String(t));
      } catch {
        // localStorage unavailable — the in-memory ref still drives the timer.
      }
    };

    // Most recent of: this tab's in-memory time, or another tab's localStorage time.
    const lastActive = () => {
      let t = lastActivityRef.current;
      try {
        const stored = Number(localStorage.getItem(STORAGE_KEY));
        if (Number.isFinite(stored) && stored > t) t = stored;
      } catch {
        // ignore — fall back to the in-memory ref
      }
      return t;
    };

    markActive();

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((e) =>
      window.addEventListener(e, markActive, { passive: true })
    );

    const check = () => {
      if (now() - lastActive() >= timeoutMs) forceLogout();
    };

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
