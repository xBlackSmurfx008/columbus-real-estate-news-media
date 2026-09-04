// ============================================================
// Per-area performance rollup (owner plan 2026-09-04, P1 item 8).
//
// The owner asked for three numbers per area: organic entrances, email
// follows, and leads. This module produces them from the telemetry that
// already shipped rather than from a parallel scheme:
//
//   organic entrances  page_views (path, referrer_host, visitor_hash), joined
//                      to an area either by the /areas/<slug> path or by the
//                      article's own area_slug. "Organic" means the referrer
//                      host is a search engine.
//   follows            activation_events `area_follow_start` and
//                      `preference_saved` (lib/activation-analytics.ts already
//                      defines and captures both with an area dimension).
//   leads              funnel_events (lib/funnel-events.ts, which already
//                      carries `area`) plus the `leads` table's own area.
//
// Two things this file exists to get right:
//
//  1. `area` arrives in three shapes. A hub path gives a slug
//     ("upper-arlington"), a funnel query parameter or lead form gives a
//     display name ("Upper Arlington"), and an activation payload gives
//     either. `normalizeAreaKey` folds all three onto one slug so a single
//     area is never counted as two rows.
//  2. Test traffic is excluded by the callers using the shared predicate in
//     scripts/test-traffic-lib.mjs, the same rule kpi-report.mjs uses. This
//     module never re-derives it.
//
// It is deliberately free of value imports so it can be unit tested with
// `node --test` and reused from build scripts. `scripts/kpi-report.mjs` is
// owned elsewhere and is not touched.
// ============================================================

/** Search engines whose referrals count as an organic entrance. */
export const ORGANIC_REFERRER_PATTERNS: readonly string[] = [
  "google.",
  "bing.",
  "duckduckgo.",
  "search.yahoo.",
  "ecosia.org",
  "search.brave.com",
  "startpage.com",
  "qwant.com",
  "baidu.com",
  "yandex.",
  "perplexity.ai",
  "chatgpt.com",
];

/**
 * True when a stored `referrer_host` is a search engine.
 *
 * A missing referrer host is direct or unknown traffic, not organic. We would
 * rather understate organic entrances than credit a channel we cannot see.
 */
export function isOrganicReferrerHost(host: string | null | undefined): boolean {
  if (typeof host !== "string") return false;
  const clean = host.trim().toLowerCase().replace(/^www\./, "");
  if (!clean) return false;
  return ORGANIC_REFERRER_PATTERNS.some(
    (pattern) => clean === pattern.replace(/\.$/, "") || clean.startsWith(pattern) || clean.includes(`.${pattern}`),
  );
}

/** Area slug out of a hub path, else null. */
export function areaSlugFromHubPath(path: string | null | undefined): string | null {
  if (typeof path !== "string") return null;
  const match = path.split(/[?#]/)[0].match(/^\/areas\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!).toLowerCase();
  } catch {
    return match[1]!.toLowerCase();
  }
}

function slugifyAreaName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type AreaDirectoryEntry = { slug: string; name: string };

/**
 * Fold a slug, a display name, or a hub path onto one canonical area slug.
 *
 * The directory is consulted first so names that do not slugify back to their
 * own slug (for example "The Ohio State University area") still resolve.
 * Without a directory the function degrades to slugifying, which is correct
 * for the large majority of CREN area names.
 */
export function normalizeAreaKey(
  value: string | null | undefined,
  directory: AreaDirectoryEntry[] = [],
): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const fromPath = areaSlugFromHubPath(raw);
  const candidate = fromPath ?? raw;

  const lower = candidate.toLowerCase();
  for (const entry of directory) {
    if (entry.slug.toLowerCase() === lower) return entry.slug;
    if (entry.name.trim().toLowerCase() === lower) return entry.slug;
  }

  const slugified = slugifyAreaName(candidate);
  if (!slugified) return null;
  for (const entry of directory) {
    if (entry.slug.toLowerCase() === slugified) return entry.slug;
  }
  return slugified;
}

// ---------- input rows ----------

/** One grouped page_views bucket. `areaSlug` is resolved by the caller's SQL. */
export type AreaEntranceRow = {
  areaSlug: string | null;
  /** "hub" for /areas/<slug>, "article" for an article filed to the area. */
  surface: "hub" | "article";
  referrerHost: string | null;
  views: number;
  visitors: number;
};

/** One grouped activation_events bucket. */
export type AreaActivationRow = {
  areaSlug: string | null;
  follows: number;
  preferencesSaved: number;
};

/** One grouped funnel_events bucket. Test rows must already be excluded. */
export type AreaFunnelRow = {
  area: string | null;
  stage: string;
  events: number;
};

/** One grouped leads bucket. Test rows must already be excluded. */
export type AreaLeadRow = {
  area: string | null;
  status: string;
  leads: number;
};

export type AreaPerformanceInput = {
  directory?: AreaDirectoryEntry[];
  entrances?: AreaEntranceRow[];
  activation?: AreaActivationRow[];
  funnel?: AreaFunnelRow[];
  leads?: AreaLeadRow[];
  /** Slugs to mark as flagship in the output. */
  flagshipSlugs?: readonly string[];
};

export type AreaPerformanceRow = {
  areaSlug: string;
  areaName: string;
  isFlagship: boolean;
  /** All page views on the hub page. */
  hubViews: number;
  hubVisitors: number;
  /** All page views on articles filed to this area. */
  articleViews: number;
  /** Hub views whose referrer was a search engine. */
  organicHubEntrances: number;
  /** Article views whose referrer was a search engine. */
  organicArticleEntrances: number;
  /** The owner's "organic entrances by area": hub plus article. */
  organicEntrances: number;
  follows: number;
  preferencesSaved: number;
  funnelViews: number;
  ctaClicks: number;
  formSubmits: number;
  leads: number;
  qualifiedLeads: number;
  /** Follows per 100 hub views, or null when the hub had no views. */
  followRatePer100HubViews: number | null;
  /** Leads per 100 organic entrances, or null when there were none. */
  leadRatePer100Organic: number | null;
};

export type AreaPerformanceSummary = {
  rows: AreaPerformanceRow[];
  totals: {
    areas: number;
    organicEntrances: number;
    follows: number;
    leads: number;
  };
  flagship: {
    areas: number;
    organicEntrances: number;
    follows: number;
    leads: number;
    /** Flagship share of all area-attributable organic entrances, in percent. */
    shareOfOrganicEntrances: number | null;
  };
};

/** Statuses that count as a qualified lead. Mirrors QUALIFIED_STATUSES. */
const QUALIFIED_LEAD_STATUSES = new Set(["qualified", "opportunity", "won"]);

function readableAreaLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * The clean per-area rollup. Pure: give it rows, get the three owner numbers
 * per area plus the funnel steps between them.
 */
export function buildAreaPerformance(input: AreaPerformanceInput): AreaPerformanceSummary {
  const directory = input.directory ?? [];
  const nameBySlug = new Map(directory.map((entry) => [entry.slug, entry.name]));
  const flagship = new Set(input.flagshipSlugs ?? []);

  const rows = new Map<string, AreaPerformanceRow>();
  const ensure = (slug: string): AreaPerformanceRow => {
    const existing = rows.get(slug);
    if (existing) return existing;
    const created: AreaPerformanceRow = {
      areaSlug: slug,
      areaName: nameBySlug.get(slug) ?? readableAreaLabel(slug),
      isFlagship: flagship.has(slug),
      hubViews: 0,
      hubVisitors: 0,
      articleViews: 0,
      organicHubEntrances: 0,
      organicArticleEntrances: 0,
      organicEntrances: 0,
      follows: 0,
      preferencesSaved: 0,
      funnelViews: 0,
      ctaClicks: 0,
      formSubmits: 0,
      leads: 0,
      qualifiedLeads: 0,
      followRatePer100HubViews: null,
      leadRatePer100Organic: null,
    };
    rows.set(slug, created);
    return created;
  };

  const count = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
  };

  for (const entrance of input.entrances ?? []) {
    const slug = normalizeAreaKey(entrance.areaSlug, directory);
    if (!slug) continue;
    const row = ensure(slug);
    const views = count(entrance.views);
    const organic = isOrganicReferrerHost(entrance.referrerHost) ? views : 0;
    if (entrance.surface === "hub") {
      row.hubViews += views;
      row.hubVisitors += count(entrance.visitors);
      row.organicHubEntrances += organic;
    } else {
      row.articleViews += views;
      row.organicArticleEntrances += organic;
    }
    row.organicEntrances += organic;
  }

  for (const activation of input.activation ?? []) {
    const slug = normalizeAreaKey(activation.areaSlug, directory);
    if (!slug) continue;
    const row = ensure(slug);
    row.follows += count(activation.follows);
    row.preferencesSaved += count(activation.preferencesSaved);
  }

  for (const funnelRow of input.funnel ?? []) {
    const slug = normalizeAreaKey(funnelRow.area, directory);
    if (!slug) continue;
    const row = ensure(slug);
    const events = count(funnelRow.events);
    if (funnelRow.stage === "funnel_view") row.funnelViews += events;
    else if (funnelRow.stage === "cta_click") row.ctaClicks += events;
    else if (funnelRow.stage === "form_submit") row.formSubmits += events;
  }

  for (const leadRow of input.leads ?? []) {
    const slug = normalizeAreaKey(leadRow.area, directory);
    if (!slug) continue;
    const row = ensure(slug);
    const leads = count(leadRow.leads);
    row.leads += leads;
    if (QUALIFIED_LEAD_STATUSES.has(leadRow.status)) row.qualifiedLeads += leads;
  }

  const ordered = [...rows.values()]
    .map((row) => ({
      ...row,
      followRatePer100HubViews: rate(row.follows, row.hubViews),
      leadRatePer100Organic: rate(row.leads, row.organicEntrances),
    }))
    .sort(
      (a, b) =>
        Number(b.isFlagship) - Number(a.isFlagship) ||
        b.organicEntrances - a.organicEntrances ||
        b.leads - a.leads ||
        b.follows - a.follows ||
        a.areaSlug.localeCompare(b.areaSlug),
    );

  const sum = (list: AreaPerformanceRow[], key: "organicEntrances" | "follows" | "leads") =>
    list.reduce((total, row) => total + row[key], 0);

  const flagshipRows = ordered.filter((row) => row.isFlagship);
  const totalOrganic = sum(ordered, "organicEntrances");

  return {
    rows: ordered,
    totals: {
      areas: ordered.length,
      organicEntrances: totalOrganic,
      follows: sum(ordered, "follows"),
      leads: sum(ordered, "leads"),
    },
    flagship: {
      areas: flagshipRows.length,
      organicEntrances: sum(flagshipRows, "organicEntrances"),
      follows: sum(flagshipRows, "follows"),
      leads: sum(flagshipRows, "leads"),
      shareOfOrganicEntrances: rate(sum(flagshipRows, "organicEntrances"), totalOrganic),
    },
  };
}
