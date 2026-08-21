"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Fires one POST /api/pageview per route change (server-persisted traffic,
// CMO directive 2026-08-17 P1). No cookies, no localStorage, nothing blocking:
// sendBeacon when available, keepalive fetch otherwise. Failures are silent.
export function PageviewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    const payload = JSON.stringify({ path: pathname, referrer: document.referrer || null });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/pageview", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/pageview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Never let analytics surface to the reader.
    }
  }, [pathname]);

  return null;
}
