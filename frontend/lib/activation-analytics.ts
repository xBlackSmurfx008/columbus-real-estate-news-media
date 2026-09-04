export type AnalyticsPrimitive = string | number | boolean | null;

export type StoredActivationEvent = {
  name: string;
  payload: Record<string, AnalyticsPrimitive>;
  timestamp: string;
  path: string;
};

export type StoredAreaPageView = {
  path: string;
  views: number;
  visitors: number;
};

export const ANALYTICS_STORAGE_KEY = "cren_analytics_events";

export const ACTIVATION_EVENT_DEFINITIONS = [
  { name: "area_follow_start", label: "Area follows started" },
  { name: "preference_saved", label: "Preferences saved" },
  { name: "activation_step", label: "Activation steps" },
  { name: "renter_checklist_start", label: "Checklist starts" },
  { name: "renter_checklist_complete", label: "Checklist completions" },
  { name: "search_no_results", label: "Zero-result searches" },
  { name: "generate_lead", label: "Lead forms submitted" },
  { name: "contact_request", label: "Contact forms submitted" },
  { name: "sign_up", label: "Signup events" },
  { name: "article_cta_view", label: "Article CTAs seen" },
  { name: "article_cta_click", label: "Article CTAs clicked" },
] as const;

export type ActivationEventName = (typeof ACTIVATION_EVENT_DEFINITIONS)[number]["name"];

const ACTIVATION_EVENT_SET = new Set<string>(ACTIVATION_EVENT_DEFINITIONS.map((event) => event.name));

const ALLOWED_PAYLOAD_KEYS = new Set([
  "article_id",
  "article_url",
  "cta_id",
  "destination",
  "funnel",
  "placement",
  "area",
  "area_name",
  "area_slug",
  "cadence",
  "checklist",
  "content_type",
  "conversion",
  "daysSinceLastVisit",
  "inferred_intent",
  "interests",
  "inquiry_type",
  "isReturnVisit",
  "item_category",
  "item_id",
  "item_list_name",
  "membership",
  "method",
  "persona",
  "percent_scrolled",
  "role",
  "saved",
  "search_term",
  "section_id",
  "source",
  "step",
  "topic",
]);

export function isActivationEventName(name: string): name is ActivationEventName {
  return ACTIVATION_EVENT_SET.has(name);
}

export function sanitizeAnalyticsPayload(payload: unknown): Record<string, AnalyticsPrimitive> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};

  const cleaned: Record<string, AnalyticsPrimitive> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) continue;
    if (typeof value === "string") {
      const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 180);
      cleaned[key] = trimmed || null;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      cleaned[key] = value;
    } else if (typeof value === "boolean") {
      cleaned[key] = value;
    } else if (value === null) {
      cleaned[key] = null;
    }
  }
  return cleaned;
}

function topValues(events: StoredActivationEvent[], keys: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const raw = keys.map((key) => event.payload[key]).find((value) => typeof value === "string" && value.trim());
    if (typeof raw !== "string") continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function areaSlugFromPath(path: string): string | null {
  const match = path.match(/^\/areas\/([^/?#]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function areaSlugFromEvent(event: StoredActivationEvent): string | null {
  const payloadSlug = event.payload.area_slug;
  if (typeof payloadSlug === "string" && payloadSlug) return payloadSlug;

  const pathSlug = areaSlugFromPath(event.path);
  if (pathSlug) return pathSlug;

  const method = event.payload.method ?? event.payload.source;
  if (typeof method === "string" && method.endsWith("-area-hub")) {
    return method.slice(0, -"-area-hub".length);
  }
  return null;
}

function readableAreaLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const FORM_EVENT_NAMES = new Set(["generate_lead", "contact_request"]);

/**
 * CTR per article CTA placement (owner plan 2026-09-04, P1 item 4).
 * Groups `article_cta_view` / `article_cta_click` by funnel and placement so
 * the click-through rate of each contextual CTA is readable in one number.
 */
export function summarizeArticleCtaPerformance(events: StoredActivationEvent[]) {
  const rows = new Map<string, { funnel: string; placement: string; views: number; clicks: number; ctr: number | null }>();

  for (const event of events) {
    if (event.name !== "article_cta_view" && event.name !== "article_cta_click") continue;
    const funnel = typeof event.payload.funnel === "string" ? event.payload.funnel : "unknown";
    const placement = typeof event.payload.placement === "string" ? event.payload.placement : "unknown";
    const key = `${funnel}|${placement}`;
    const row = rows.get(key) ?? { funnel, placement, views: 0, clicks: 0, ctr: null };
    if (event.name === "article_cta_view") row.views += 1;
    else row.clicks += 1;
    rows.set(key, row);
  }

  return [...rows.values()]
    .map((row) => ({ ...row, ctr: row.views > 0 ? Math.round((row.clicks / row.views) * 1000) / 10 : null }))
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks || a.funnel.localeCompare(b.funnel));
}

export function summarizeActivationEvents(events: StoredActivationEvent[], areaPageViews: StoredAreaPageView[] = []) {
  const relevant = events.filter((event) => isActivationEventName(event.name));
  const countByName = new Map<string, number>();
  for (const event of relevant) {
    countByName.set(event.name, (countByName.get(event.name) ?? 0) + 1);
  }

  const checklistStarts = countByName.get("renter_checklist_start") ?? 0;
  const checklistCompletions = countByName.get("renter_checklist_complete") ?? 0;
  const checklistCompletionRate = checklistStarts > 0 ? Math.round((checklistCompletions / checklistStarts) * 100) : null;
  const formEvents = relevant.filter((event) => FORM_EVENT_NAMES.has(event.name));

  const areaMetrics = new Map<
    string,
    {
      area_slug: string;
      area_name: string;
      views: number;
      visitors: number;
      follows: number;
      preferences: number;
      formSubmissions: number;
      followRate: number | null;
      preferenceRate: number | null;
    }
  >();

  const ensureArea = (slug: string) => {
    const existing = areaMetrics.get(slug);
    if (existing) return existing;
    const created = {
      area_slug: slug,
      area_name: readableAreaLabel(slug),
      views: 0,
      visitors: 0,
      follows: 0,
      preferences: 0,
      formSubmissions: 0,
      followRate: null,
      preferenceRate: null,
    };
    areaMetrics.set(slug, created);
    return created;
  };

  for (const pageView of areaPageViews) {
    const slug = areaSlugFromPath(pageView.path);
    if (!slug) continue;
    const metric = ensureArea(slug);
    metric.views += Math.max(0, Math.trunc(pageView.views));
    metric.visitors += Math.max(0, Math.trunc(pageView.visitors));
  }

  for (const event of relevant) {
    const slug = areaSlugFromEvent(event);
    if (!slug) continue;
    const metric = ensureArea(slug);
    const areaName = event.payload.area_name ?? event.payload.area;
    if (typeof areaName === "string" && areaName) metric.area_name = areaName;
    if (event.name === "area_follow_start") metric.follows += 1;
    if (event.name === "preference_saved") metric.preferences += 1;
    if (FORM_EVENT_NAMES.has(event.name)) metric.formSubmissions += 1;
  }

  const areaHubPerformance = [...areaMetrics.values()]
    .map((metric) => ({
      ...metric,
      followRate: metric.views > 0 ? Math.round((metric.follows / metric.views) * 1000) / 10 : null,
      preferenceRate: metric.views > 0 ? Math.round((metric.preferences / metric.views) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.views - a.views || b.preferences - a.preferences || b.follows - a.follows || a.area_name.localeCompare(b.area_name))
    .slice(0, 25);

  return {
    totalEvents: relevant.length,
    eventCounts: ACTIVATION_EVENT_DEFINITIONS.map((definition) => ({
      ...definition,
      count: countByName.get(definition.name) ?? 0,
    })),
    areaFollows: countByName.get("area_follow_start") ?? 0,
    preferencesSaved: countByName.get("preference_saved") ?? 0,
    zeroResultSearches: countByName.get("search_no_results") ?? 0,
    formSubmissions: formEvents.length,
    checklistStarts,
    checklistCompletions,
    checklistCompletionRate,
    topAreas: topValues(relevant, ["area_name", "area", "area_slug"]),
    topSources: topValues(relevant, ["method", "source", "section_id"]),
    topPersonas: topValues(relevant, ["persona", "role"]),
    topFormSources: topValues(formEvents, ["method", "source", "section_id"]),
    topFormPersonas: topValues(formEvents, ["persona", "role", "inquiry_type"]),
    topSearchTerms: topValues(
      relevant.filter((event) => event.name === "search_no_results"),
      ["search_term"],
    ),
    topSearchIntents: topValues(
      relevant.filter((event) => event.name === "search_no_results"),
      ["inferred_intent"],
    ),
    areaHubPerformance,
    recentEvents: relevant
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 20),
  };
}
