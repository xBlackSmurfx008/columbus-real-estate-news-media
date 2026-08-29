"use client";

import {
  ANALYTICS_STORAGE_KEY,
  isActivationEventName,
  sanitizeAnalyticsPayload,
  type AnalyticsPrimitive,
} from "@/lib/activation-analytics";

type AnalyticsPayload = Record<string, AnalyticsPrimitive>;

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const sanitizedPayload = sanitizeAnalyticsPayload(payload);
  const entry = {
    name,
    payload: sanitizedPayload,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  };

  try {
    const existing = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    const parsed: typeof entry[] = existing ? JSON.parse(existing) : [];
    parsed.push(entry);
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(parsed.slice(-200)));
  } catch {
    // Non-blocking analytics; ignore storage failures.
  }

  if (isActivationEventName(name)) {
    const body = JSON.stringify(entry);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/event", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/analytics/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      // Server-side analytics cannot block the user action.
    }
  }

  if (typeof window !== "undefined") {
    const analyticsWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.dataLayer.push({
      event: name,
      ...sanitizedPayload,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", entry);
  }
}
