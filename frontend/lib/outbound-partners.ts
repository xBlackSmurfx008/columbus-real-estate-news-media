// Canonical registry of the outbound destinations CREN sends readers to from
// its high-intent utility pages (owner plan 2026-09-04, P2 item 10).
//
// Three rules this module exists to hold:
//
//  1. EDITORIAL NEUTRALITY. The list for an intent is a fixed, declaration-
//     ordered comparison set. Nothing here knows or can read whether a partner
//     pays us, so no ranking, filtering, or promotion can depend on money.
//     `outboundLinksFor()` takes the money information as a separate argument
//     and is required to preserve the registry order exactly. Sales principle
//     23 (never trade long-term trust for quick cash) outranks 25.
//
//  2. NO INVENTED RELATIONSHIPS. Every `url` below is the plain, public,
//     non-affiliate destination. There is no affiliate URL, tracking ID, or
//     network anywhere in this file, because as of 2026-09-04 CREN has no
//     affiliate relationship with any of these companies. Real tracking is
//     configured per partner in the `affiliate_programs` table (see
//     scripts/migrate-affiliate-tracking.mjs and docs/AFFILIATE_PROGRAMS.md);
//     until a row there says `status = 'active'` with a real `partner_id`,
//     `resolveAffiliateUrl()` returns null and the link ships as an ordinary
//     outbound link with no disclosure and no sponsored rel.
//
//  3. ONE PLACE THE DIMENSIONS COME FROM. partner -> page -> area -> intent is
//     the dimension set the click log records, and each is derived here rather
//     than typed by hand at a call site.
//
// This file must stay dependency-free: scripts/ imports it directly under
// `node --experimental-strip-types`.

/** What the reader is trying to do at the moment they click away. */
export const OUTBOUND_INTENTS = [
  "buy",
  "rent",
  "list-rental",
  "finance",
  "home-services",
] as const;

export type OutboundIntent = (typeof OUTBOUND_INTENTS)[number];

export function isOutboundIntent(value: unknown): value is OutboundIntent {
  return typeof value === "string" && (OUTBOUND_INTENTS as readonly string[]).includes(value);
}

/** A company we could plausibly hold one affiliate relationship with. */
export type OutboundPartner = {
  /** Stable identity. This is what `affiliate_clicks.partner_slug` records. */
  slug: string;
  name: string;
  /** Shown to the reader so the destination is never hidden behind /go. */
  host: string;
};

/** One destination card: a partner, an intent, and how to build its URL. */
export type OutboundDestination = {
  /** Stable key used by `/go/<key>`. Unique across the registry. */
  key: string;
  partner: string;
  intent: OutboundIntent;
  title: string;
  note: string;
  /** The plain, public, non-affiliate URL for this area. Always real. */
  url: (area: string) => string;
};

export const OUTBOUND_PARTNERS: readonly OutboundPartner[] = [
  { slug: "realtor-com", name: "Realtor.com", host: "realtor.com" },
  { slug: "zillow", name: "Zillow", host: "zillow.com" },
  { slug: "redfin", name: "Redfin", host: "redfin.com" },
  { slug: "homes-com", name: "Homes.com", host: "homes.com" },
  { slug: "apartments-com", name: "Apartments.com", host: "apartments.com" },
  { slug: "affordablehousing-com", name: "AffordableHousing.com", host: "affordablehousing.com" },
];

const partnersBySlug = new Map(OUTBOUND_PARTNERS.map((partner) => [partner.slug, partner]));

export function outboundPartner(slug: string): OutboundPartner | null {
  return partnersBySlug.get(slug) ?? null;
}

// --- area-aware destination URLs ---------------------------------------------

const METRO_AREA_RE = /^columbus(?: and central ohio)?$/i;

/** True when the reader has not narrowed to a specific place. */
export function isMetroWideArea(area: string): boolean {
  const trimmed = area.trim();
  return !trimmed || METRO_AREA_RE.test(trimmed);
}

function slugifyPlace(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function placeSlug(area: string): string {
  return slugifyPlace(`${area.trim()} OH`);
}

function placeQuery(area: string): string {
  return encodeURIComponent(`${area.trim()}, OH`);
}

/**
 * The comparison set, in editorial order, per intent.
 *
 * Removing an entry here removes a reader's option to compare. Do not remove or
 * reorder one because another company pays; `tests/outbound-partners.test.ts`
 * pins these keys and their order for exactly that reason.
 */
export const OUTBOUND_DESTINATIONS: readonly OutboundDestination[] = [
  // --- buy ---
  {
    key: "realtor-com-buy",
    partner: "realtor-com",
    intent: "buy",
    title: "Realtor.com",
    note: "Homes for sale and agent-listed properties.",
    url: (area) =>
      isMetroWideArea(area)
        ? "https://www.realtor.com/realestateandhomes-search/Columbus_OH"
        : `https://www.realtor.com/realestateandhomes-search/${placeSlug(area)}`,
  },
  {
    key: "zillow-buy",
    partner: "zillow",
    intent: "buy",
    title: "Zillow",
    note: "For-sale listings, saved searches, and property pages.",
    url: (area) =>
      isMetroWideArea(area)
        ? "https://www.zillow.com/columbus-oh/"
        : `https://www.zillow.com/homes/${placeQuery(area)}_rb/`,
  },
  {
    key: "redfin-buy",
    partner: "redfin",
    intent: "buy",
    title: "Redfin",
    note: "For-sale search, map tools, and market context.",
    url: (area) =>
      isMetroWideArea(area)
        ? "https://www.redfin.com/city/4664/OH/Columbus"
        : `https://www.redfin.com/city?q=${placeQuery(area)}`,
  },
  {
    key: "homes-com-buy",
    partner: "homes-com",
    intent: "buy",
    title: "Homes.com",
    note: "Another broad portal for comparing active inventory.",
    url: (area) =>
      isMetroWideArea(area) ? "https://www.homes.com/columbus-oh/" : `https://www.homes.com/${placeSlug(area)}/`,
  },

  // --- rent ---
  {
    key: "apartments-com-rent",
    partner: "apartments-com",
    intent: "rent",
    title: "Apartments.com",
    note: "Apartments, houses, condos, and townhomes for rent.",
    url: (area) =>
      isMetroWideArea(area)
        ? "https://www.apartments.com/columbus-oh/"
        : `https://www.apartments.com/${placeSlug(area)}/`,
  },
  {
    key: "zillow-rent",
    partner: "zillow",
    intent: "rent",
    title: "Zillow Rentals",
    note: "Rental listings and saved searches across housing types.",
    url: (area) =>
      isMetroWideArea(area)
        ? "https://www.zillow.com/columbus-oh/rentals/"
        : `https://www.zillow.com/${placeSlug(area)}/rentals/`,
  },
  {
    key: "realtor-com-rent",
    partner: "realtor-com",
    intent: "rent",
    title: "Realtor.com Rentals",
    note: "Agent and property-manager rental listings.",
    url: (area) =>
      isMetroWideArea(area)
        ? "https://www.realtor.com/apartments/Columbus_OH"
        : `https://www.realtor.com/apartments/${placeSlug(area)}`,
  },
  {
    key: "affordablehousing-com-rent",
    partner: "affordablehousing-com",
    intent: "rent",
    title: "AffordableHousing.com",
    note: "Affordable rental and housing-assistance search tools.",
    url: (area) =>
      isMetroWideArea(area)
        ? "https://www.affordablehousing.com/columbus-oh/"
        : `https://www.affordablehousing.com/${placeSlug(area)}/`,
  },

  // --- list a rental ---
  {
    key: "zillow-list-rental",
    partner: "zillow",
    intent: "list-rental",
    title: "Zillow Rental Manager",
    note: "Create and distribute a rental listing; review current pricing and network terms.",
    url: () => "https://www.zillow.com/rental-manager/",
  },
  {
    key: "apartments-com-list-rental",
    partner: "apartments-com",
    intent: "list-rental",
    title: "Apartments.com Rental Manager",
    note: "Advertise rentals and manage inquiries; confirm current product terms.",
    url: () => "https://www.apartments.com/rental-manager/",
  },
  {
    key: "realtor-com-list-rental",
    partner: "realtor-com",
    intent: "list-rental",
    title: "Avail by Realtor.com",
    note: "Rental listing and landlord tools; confirm current syndication and pricing terms.",
    url: () => "https://www.realtor.com/landlords/list-rental-property",
  },
];

const destinationsByKey = new Map(OUTBOUND_DESTINATIONS.map((destination) => [destination.key, destination]));

export function outboundDestination(key: string): OutboundDestination | null {
  return destinationsByKey.get(key) ?? null;
}

/** The comparison set for one intent, in registry order. Never money-ordered. */
export function outboundDestinationsFor(intent: OutboundIntent): OutboundDestination[] {
  return OUTBOUND_DESTINATIONS.filter((destination) => destination.intent === intent);
}

// --- affiliate program configuration -----------------------------------------

export const AFFILIATE_PROGRAM_STATUSES = ["unconfigured", "pending", "active"] as const;
export type AffiliateProgramStatus = (typeof AFFILIATE_PROGRAM_STATUSES)[number];

/**
 * One row of `affiliate_programs`: the record of a relationship the owner has
 * actually entered into. Everything here is null/unconfigured until a real
 * program is joined and its real ID is pasted in.
 */
export type AffiliateProgram = {
  partner_slug: string;
  /** The program the owner joined, e.g. as named in its own dashboard. */
  program_name: string | null;
  /** Affiliate/publisher ID issued by that program. Never invented. */
  partner_id: string | null;
  /**
   * How that program wants the link built. Supports two placeholders:
   *   {{PARTNER_ID}}  — required; substituted with partner_id
   *   {{DESTINATION}} — optional; the URL-encoded plain destination
   */
  tracking_url_template: string | null;
  status: AffiliateProgramStatus;
  notes: string | null;
};

const PLACEHOLDER_HOST_RE = /(^|\.)example\.(com|org|net)(\/|$|:)/i;

/** A URL we must never treat as a real destination. */
export function isPlaceholderUrl(url: string): boolean {
  return PLACEHOLDER_HOST_RE.test(url);
}

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Turn a plain destination into a monetized one, or return null.
 *
 * Returns null — meaning "ship the ordinary link, show no disclosure" — unless
 * ALL of these hold, which is the mechanism that makes a fabricated
 * relationship impossible to render:
 *   - the program row exists and is `active`
 *   - it carries a non-empty partner_id
 *   - it carries a template that actually uses {{PARTNER_ID}}
 *   - the resulting URL is https and is not a placeholder
 */
export function resolveAffiliateUrl(
  program: AffiliateProgram | null | undefined,
  destinationUrl: string,
): string | null {
  if (!program || program.status !== "active") return null;

  const partnerId = program.partner_id?.trim();
  const template = program.tracking_url_template?.trim();
  if (!partnerId || !template) return null;
  if (!template.includes("{{PARTNER_ID}}")) return null;

  const resolved = template
    .replaceAll("{{PARTNER_ID}}", encodeURIComponent(partnerId))
    .replaceAll("{{DESTINATION}}", encodeURIComponent(destinationUrl));

  if (resolved.includes("{{")) return null;
  if (!isHttps(resolved) || isPlaceholderUrl(resolved)) return null;
  return resolved;
}

// --- resolved links (what a page actually renders) ---------------------------

export type OutboundLink = {
  key: string;
  partner: string;
  partnerName: string;
  host: string;
  intent: OutboundIntent;
  title: string;
  note: string;
  /** The plain public URL. Shown to the reader; used as the redirect fallback. */
  destinationUrl: string;
  /** True only when a real, active affiliate program resolved for this link. */
  sponsored: boolean;
};

/**
 * Build the rendered comparison set for an intent.
 *
 * `programs` may be empty, partial, or full: the ONLY thing it changes is each
 * link's `sponsored` flag. Membership and order come from the registry alone,
 * so a paying partner can never gain position and a non-paying one can never
 * lose its place. `tests/outbound-partners.test.ts` asserts this directly.
 */
export function outboundLinksFor(
  intent: OutboundIntent,
  area: string,
  programs: ReadonlyMap<string, AffiliateProgram> | null = null,
): OutboundLink[] {
  return outboundDestinationsFor(intent).map((destination) => {
    const partner = outboundPartner(destination.partner);
    const destinationUrl = destination.url(area);
    const program = programs?.get(destination.partner) ?? null;
    return {
      key: destination.key,
      partner: destination.partner,
      partnerName: partner?.name ?? destination.title,
      host: partner?.host ?? "",
      intent: destination.intent,
      title: destination.title,
      note: destination.note,
      destinationUrl,
      sponsored: resolveAffiliateUrl(program, destinationUrl) !== null,
    };
  });
}

// --- the /go link ------------------------------------------------------------

export type OutboundClickDimensions = {
  /** The CREN page the reader clicked from. */
  page: string;
  /** Area context, when the page has one. */
  area?: string | null;
  /** Named block on the page, for placement-level reporting. */
  placement?: string | null;
  /** Campaign / smoke-test marker, per docs/TEST_TRAFFIC_CONVENTION.md. */
  source?: string | null;
};

/**
 * The tracked href for a destination. Always same-origin: the destination is
 * rebuilt server-side from the registry key, so there is no redirect target in
 * the query string and therefore no open-redirect surface.
 */
export function outboundHref(key: string, dimensions: OutboundClickDimensions): string {
  const params = new URLSearchParams();
  params.set("from", dimensions.page);
  if (dimensions.area) params.set("area", dimensions.area);
  if (dimensions.placement) params.set("placement", dimensions.placement);
  if (dimensions.source) params.set("source", dimensions.source);
  return `/go/${encodeURIComponent(key)}?${params.toString()}`;
}
