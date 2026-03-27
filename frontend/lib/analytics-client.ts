"use client";

type AnalyticsPayload = Record<string, string | number | boolean | null>;

const STORAGE_KEY = "crem_analytics_events";

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const entry = {
    name,
    payload,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  };

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    const parsed: typeof entry[] = existing ? JSON.parse(existing) : [];
    parsed.push(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.slice(-200)));
  } catch {
    // Non-blocking analytics; ignore storage failures.
  }

  if (typeof window !== "undefined") {
    const analyticsWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.dataLayer.push({
      event: name,
      ...payload,
    });
  }

  console.info("[analytics]", entry);
}
