"use client";

import { funnelForPath, type FunnelStage } from "@/scripts/funnel-lib.mjs";

// Browser side of the funnel chain (owner plan 2026-09-04, P0 item 2).
//
// Attribution is captured once per session and replayed onto every later event,
// so a form_submit still knows which article and which campaign produced it
// even though the reader has since navigated away from that page.

const ATTRIBUTION_KEY = "cren_funnel_attribution";

export type FunnelAttribution = {
  articleUrl: string | null;
  articleSlug: string | null;
  area: string | null;
  campaignSource: string | null;
  campaignMedium: string | null;
  campaignName: string | null;
  referrerHost: string | null;
};

const EMPTY: FunnelAttribution = {
  articleUrl: null,
  articleSlug: null,
  area: null,
  campaignSource: null,
  campaignMedium: null,
  campaignName: null,
  referrerHost: null,
};

function slugFromPath(path: string): string | null {
  const match = path.split(/[?#]/)[0].match(/^\/blog\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function areaFromPath(path: string): string | null {
  const match = path.split(/[?#]/)[0].match(/^\/areas\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function sameOriginPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}

function readStored(): FunnelAttribution {
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<FunnelAttribution>) };
  } catch {
    return { ...EMPTY };
  }
}

function write(attribution: FunnelAttribution) {
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Private browsing / storage disabled: fall back to per-event attribution.
  }
}

/**
 * Merge what this page knows into the stored session attribution. First touch
 * wins for campaign fields; the most recent on-site article wins for article
 * fields, because that is the story that actually sent the reader to a funnel.
 */
export function captureAttribution(path: string): FunnelAttribution {
  if (typeof window === "undefined") return { ...EMPTY };

  const stored = readStored();
  const params = new URLSearchParams(window.location.search);

  const articleSlug = slugFromPath(path);
  if (articleSlug) {
    stored.articleSlug = articleSlug;
    stored.articleUrl = `${window.location.origin}${path}`;
  }

  const area = areaFromPath(path) ?? params.get("area");
  if (area) stored.area = area.slice(0, 120);

  const referrerPath = document.referrer ? sameOriginPath(document.referrer) : null;
  if (!stored.articleSlug && referrerPath) {
    const referrerSlug = slugFromPath(referrerPath);
    if (referrerSlug) {
      stored.articleSlug = referrerSlug;
      stored.articleUrl = `${window.location.origin}${referrerPath}`;
    }
  }

  if (!stored.campaignSource) {
    stored.campaignSource =
      params.get("utm_source") ?? params.get("source") ?? params.get("ref") ?? null;
  }
  if (!stored.campaignMedium) stored.campaignMedium = params.get("utm_medium");
  if (!stored.campaignName) stored.campaignName = params.get("utm_campaign");

  if (!stored.referrerHost && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      stored.referrerHost = host && host !== window.location.hostname ? host : null;
    } catch {
      stored.referrerHost = null;
    }
  }

  write(stored);
  return stored;
}

export function currentAttribution(): FunnelAttribution {
  if (typeof window === "undefined") return { ...EMPTY };
  return readStored();
}

export function trackFunnelStage(
  funnel: string,
  stage: FunnelStage,
  extra: { placement?: string | null; area?: string | null; path?: string | null } = {},
) {
  if (typeof window === "undefined" || !funnel) return;

  const attribution = currentAttribution();
  const body = JSON.stringify({
    funnel,
    stage,
    path: extra.path ?? window.location.pathname,
    placement: extra.placement ?? null,
    area: extra.area ?? attribution.area,
    articleUrl: attribution.articleUrl,
    articleSlug: attribution.articleSlug,
    campaignSource: attribution.campaignSource,
    campaignMedium: attribution.campaignMedium,
    campaignName: attribution.campaignName,
    referrerHost: attribution.referrerHost,
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/funnel/event", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/funnel/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry must never break the reader's action.
  }
}

/** Which funnel, if any, a same-origin href points at. */
export function funnelForHref(href: string) {
  const path = sameOriginPath(href);
  return path ? funnelForPath(path) : null;
}
