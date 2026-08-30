export type CrenCrmEventType =
  | "lead"
  | "contact"
  | "newsletter_subscriber"
  | "listing_inquiry"
  | "profile_claim"
  | "member_profile";

export type CrenCrmSyncInput = {
  eventType: CrenCrmEventType;
  externalId: string;
  occurredAt?: string;
  contact: {
    name?: string | null;
    email: string;
    phone?: string | null;
    company?: string | null;
    role?: string | null;
    website?: string | null;
    city?: string | null;
    state?: string | null;
  };
  lead?: {
    title?: string | null;
    persona?: string | null;
    source?: string | null;
    routeKey?: string | null;
    assignedTo?: string | null;
    routingStatus?: string | null;
    area?: string | null;
    message?: string | null;
    details?: string | null;
    packageInterest?: string | null;
    budget?: string | null;
    subscriberSegment?: string | null;
    interestTags?: string[] | null;
    recordUrl?: string | null;
  };
  metadata?: Record<string, unknown>;
};

export type CrenCrmPayload = CrenCrmSyncInput & {
  sourceSystem: "columbus-real-estate-news";
  occurredAt: string;
};

export type CrenCrmSyncResult =
  | { ok: true; skipped?: false; status: number }
  | { ok: true; skipped: true; reason: "disabled" | "missing_secret" | "missing_url" }
  | { ok: false; status?: number; error: string };

export type CrmRouteRecommendation = {
  routeKey:
    | "residential-intake"
    | "rental-apartment-intake"
    | "investor-review"
    | "advertising-sales"
    | "profile-verification"
    | "development-desk"
    | "newsletter-growth"
    | "member-profile";
  assigneeLabel: string;
  routingStatus: "new" | "ready_for_review" | "legal_review" | "sales_review";
  responseSlaHours: number;
  reason: string;
  subscriberSegment: string;
  interestTags: string[];
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const DEFAULT_CRM_SYNC_URL = "https://crm.mradams.xyz/api/v1/inbound/cre-news";
const DEFAULT_TIMEOUT_MS = 3500;
const TAG_ALIASES: Record<string, string> = {
  advertise: "advertising",
  advertising: "advertising",
  "area alerts": "neighborhoods",
  apartments: "apartments-rentals",
  business: "professional-network",
  buyer: "listings",
  buying: "listings",
  "buyer price-band reality": "market-trends",
  "before you sign": "apartments-rentals",
  development: "development-policy",
  "development watch": "development-policy",
  investor: "investing",
  investing: "investing",
  "market data": "market-trends",
  "market pulse": "market-trends",
  neighborhoods: "neighborhoods",
  renter: "apartments-rentals",
  renting: "apartments-rentals",
  resident: "neighborhoods",
  seller: "listings",
  selling: "listings",
  "weekend planner": "events-lifestyle",
};

function cleanString(value: unknown, max = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function valuesFrom(input: unknown): string[] {
  if (Array.isArray(input)) return input.flatMap(valuesFrom);
  const text = cleanString(input, 500);
  return text ? text.split(",").map((part) => part.trim()).filter(Boolean) : [];
}

export function normalizeCrmInterestTags(...inputs: unknown[]): string[] {
  const tags: string[] = [];

  for (const raw of inputs.flatMap(valuesFrom)) {
    const normalized = TAG_ALIASES[raw.toLowerCase()] ?? slugify(raw);
    if (!normalized || tags.includes(normalized)) continue;
    tags.push(normalized.slice(0, 80));
  }

  return tags.slice(0, 12);
}

function withTag(tags: string[], tag: string): string[] {
  if (tags.includes(tag)) return tags;
  return [...tags, tag].slice(0, 12);
}

export function subscriberSegmentFrom(value: unknown): string {
  const text = cleanString(value, 120)?.toLowerCase() ?? "";
  if (["buyer", "renter", "investor", "agent", "developer", "vendor"].includes(text)) return text;
  if (text === "seller" || text === "fsbo_seller" || text === "investor_seller") return "seller";
  if (text === "business" || text === "directory_listing") return "vendor";
  if (text === "rental_listing") return "apartment_operator";
  if (text === "capital_partner") return "investor";
  if (text === "profile_claim") return "vendor";
  return "general";
}

function searchableText(input: {
  persona?: unknown;
  source?: unknown;
  inquiryType?: unknown;
  packageInterest?: unknown;
  role?: unknown;
  topic?: unknown;
  details?: unknown;
}): string {
  return [
    input.persona,
    input.source,
    input.inquiryType,
    input.packageInterest,
    input.role,
    input.topic,
    input.details,
  ]
    .map((item) => cleanString(item, 500))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function recommendCrmRoute(input: {
  persona?: unknown;
  source?: unknown;
  inquiryType?: unknown;
  packageInterest?: unknown;
  role?: unknown;
  topic?: unknown;
  interests?: unknown;
  details?: unknown;
}): CrmRouteRecommendation {
  const text = searchableText(input);
  const subscriberSegment = subscriberSegmentFrom(input.persona ?? input.role ?? input.source);
  const interestTags = normalizeCrmInterestTags(input.interests, input.topic, input.role, input.persona, input.packageInterest);

  if (text.includes("member-profile")) {
    return {
      routeKey: "member-profile",
      assigneeLabel: "Member profile updates",
      routingStatus: "new",
      responseSlaHours: 72,
      reason: "Member profile preference update.",
      subscriberSegment,
      interestTags: withTag(interestTags, "member"),
    };
  }

  if (text.includes("subscribe") || text.includes("newsletter")) {
    return {
      routeKey: "newsletter-growth",
      assigneeLabel: "Newsletter growth queue",
      routingStatus: "new",
      responseSlaHours: 72,
      reason: "Newsletter preference or reader-intent activity.",
      subscriberSegment,
      interestTags: withTag(interestTags, "newsletter"),
    };
  }

  if (text.includes("capital") || text.includes("investor")) {
    return {
      routeKey: "investor-review",
      assigneeLabel: "Investor research review",
      routingStatus: "legal_review",
      responseSlaHours: 48,
      reason: "Investor or capital request.",
      subscriberSegment: subscriberSegment === "general" ? "investor" : subscriberSegment,
      interestTags: withTag(interestTags, "investing"),
    };
  }

  if (text.includes("advertis") || text.includes("sponsor") || text.includes("media kit")) {
    return {
      routeKey: "advertising-sales",
      assigneeLabel: "Advertising sales",
      routingStatus: "sales_review",
      responseSlaHours: 24,
      reason: "Advertising or sponsorship inquiry.",
      subscriberSegment: subscriberSegment === "general" ? "vendor" : subscriberSegment,
      interestTags: withTag(interestTags, "advertising"),
    };
  }

  if (text.includes("profile") || text.includes("directory") || text.includes("claim")) {
    return {
      routeKey: "profile-verification",
      assigneeLabel: "Profile verification queue",
      routingStatus: "ready_for_review",
      responseSlaHours: 48,
      reason: "Profile, directory, or verification request.",
      subscriberSegment: subscriberSegment === "general" ? "vendor" : subscriberSegment,
      interestTags: withTag(interestTags, "professional-network"),
    };
  }

  if (text.includes("rental") || text.includes("apartment") || text.includes("renting") || text.includes("renter")) {
    return {
      routeKey: "rental-apartment-intake",
      assigneeLabel: "Rental and apartment desk",
      routingStatus: "ready_for_review",
      responseSlaHours: 24,
      reason: "Renter, landlord, or apartment-community request.",
      subscriberSegment: subscriberSegment === "general" ? "renter" : subscriberSegment,
      interestTags: withTag(interestTags, "apartments-rentals"),
    };
  }

  if (text.includes("development") || text.includes("zoning") || text.includes("permit")) {
    return {
      routeKey: "development-desk",
      assigneeLabel: "Development and policy desk",
      routingStatus: "ready_for_review",
      responseSlaHours: 48,
      reason: "Development, permit, zoning, or project-pipeline request.",
      subscriberSegment: subscriberSegment === "general" ? "developer" : subscriberSegment,
      interestTags: withTag(interestTags, "development-policy"),
    };
  }

  return {
    routeKey: "residential-intake",
    assigneeLabel: "Residential desk",
    routingStatus: "ready_for_review",
    responseSlaHours: 24,
    reason: "Default buyer, seller, owner, or general contact intake.",
    subscriberSegment,
    interestTags,
  };
}

export function crmEventTypeForLeadPersona(persona: string): CrenCrmEventType {
  if (persona === "profile_claim" || persona === "directory_listing") return "profile_claim";
  if (persona === "rental_listing") return "listing_inquiry";
  return "lead";
}

function crmSyncEnabled() {
  const flag = cleanString(process.env.CRM_SYNC_ENABLED ?? process.env.CREN_CRM_SYNC_ENABLED)?.toLowerCase();
  return !["0", "false", "no", "off"].includes(flag ?? "");
}

function crmSyncUrl() {
  return cleanString(process.env.CRM_SYNC_URL ?? process.env.CREN_CRM_SYNC_URL, 1000) ?? DEFAULT_CRM_SYNC_URL;
}

function crmSyncSecret() {
  return cleanString(process.env.CRM_SYNC_SECRET ?? process.env.CREN_CRM_SYNC_SECRET, 2000);
}

function crmSyncTimeoutMs() {
  const parsed = Number(process.env.CRM_SYNC_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(parsed, 500), 10_000);
}

function isAllowedUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "crm.mradams.xyz" &&
      parsed.pathname.startsWith("/api/v1/inbound/cre-news")
    );
  } catch {
    return false;
  }
}

function cleanTags(tags: unknown): string[] {
  return normalizeCrmInterestTags(tags).slice(0, 20);
}

export function buildCrenCrmPayload(input: CrenCrmSyncInput): CrenCrmPayload {
  return {
    sourceSystem: "columbus-real-estate-news",
    eventType: input.eventType,
    externalId: input.externalId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    contact: {
      name: cleanString(input.contact.name, 200),
      email: cleanString(input.contact.email, 320) ?? input.contact.email,
      phone: cleanString(input.contact.phone, 40),
      company: cleanString(input.contact.company, 200),
      role: cleanString(input.contact.role, 160),
      website: cleanString(input.contact.website, 500),
      city: cleanString(input.contact.city, 120),
      state: cleanString(input.contact.state, 80),
    },
    lead: input.lead
      ? {
          title: cleanString(input.lead.title, 240),
          persona: cleanString(input.lead.persona, 120),
          source: cleanString(input.lead.source, 240),
          routeKey: cleanString(input.lead.routeKey, 120),
          assignedTo: cleanString(input.lead.assignedTo, 160),
          routingStatus: cleanString(input.lead.routingStatus, 120),
          area: cleanString(input.lead.area, 160),
          message: cleanString(input.lead.message, 3000),
          details: cleanString(input.lead.details, 3000),
          packageInterest: cleanString(input.lead.packageInterest, 160),
          budget: cleanString(input.lead.budget, 160),
          subscriberSegment: cleanString(input.lead.subscriberSegment, 120),
          interestTags: cleanTags(input.lead.interestTags),
          recordUrl: cleanString(input.lead.recordUrl, 1000),
        }
      : undefined,
    metadata: input.metadata,
  };
}

export async function syncTo008Crm(input: CrenCrmSyncInput, fetcher: FetchLike = fetch): Promise<CrenCrmSyncResult> {
  if (!crmSyncEnabled()) {
    return { ok: true, skipped: true, reason: "disabled" };
  }

  const url = crmSyncUrl();
  if (!url || !isAllowedUrl(url)) {
    return { ok: true, skipped: true, reason: "missing_url" };
  }

  const secret = crmSyncSecret();
  if (!secret) {
    return { ok: true, skipped: true, reason: "missing_secret" };
  }

  const payload = buildCrenCrmPayload(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), crmSyncTimeoutMs());

  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payload.externalId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, status: response.status, error: `CRM sync failed with status ${response.status}.` };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export function warnOnCrmSyncFailure(context: string, result: CrenCrmSyncResult) {
  if (!result.ok) {
    console.warn("[crm-sync]", context, result.error, result.status ? { status: result.status } : undefined);
  }
}
