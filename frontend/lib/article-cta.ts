// Contextual article -> funnel CTA matching (owner plan 2026-09-04, P1 item 4).
//
// Every published article gets exactly ONE primary next action after the body,
// chosen from the article's own taxonomy (category, topic_slug, area_slug,
// tags). No popups, no interstitials, no paywalls. If nothing matches we fall
// back to free membership.
//
// Copy rules: "you"/"your", outcomes first, short declarative sentences, no em
// dashes, and nothing we cannot actually deliver.

export type ArticleFunnel =
  | "renter"
  | "home_seller"
  | "investor_seller"
  | "capital"
  | "area_follow"
  | "membership";

export type ArticleCtaTaxonomy = {
  category?: string | null;
  topic_slug?: string | null;
  area_slug?: string | null;
  tags?: unknown;
};

export type ArticleCta =
  | {
      kind: "link";
      funnel: Exclude<ArticleFunnel, "area_follow">;
      ctaId: string;
      eyebrow: string;
      heading: string;
      body: string;
      /** Optional plain-language disclosure shown under the body. */
      note?: string;
      actionLabel: string;
      href: string;
    }
  | {
      kind: "area_follow";
      funnel: "area_follow";
      ctaId: string;
      areaSlug: string;
    };

const GENERIC_AREAS = new Set(["columbus-citywide", "central-ohio", "columbus"]);

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function tagSet(taxonomy: ArticleCtaTaxonomy): Set<string> {
  const raw = Array.isArray(taxonomy.tags) ? taxonomy.tags : [];
  return new Set(raw.map(normalize).filter(Boolean));
}

function hasAny(values: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => values.has(candidate));
}

// Renter-facing: the story is about renting a place, not about owning one.
const RENTER_TAGS = [
  "rental-market",
  "rental-housing",
  "rentals",
  "renters",
  "apartments",
  "apartment-rents",
  "rent-growth",
  "affordable-housing",
  "student-housing",
];
const RENTER_CATEGORIES = ["rental market", "rentals", "renting"];

// Market data and home sale / ownership.
const SELLER_TAGS = [
  "market-trends",
  "housing-inventory",
  "housing-data",
  "housing-report",
  "home-prices",
  "home-sales",
  "mortgage-rates",
  "homeownership",
  "price-bands",
  "buyer-guide",
  "property-taxes",
  "condominiums",
  "residential",
];
const SELLER_CATEGORIES = ["market analysis", "market", "market trends", "housing market"];

// Investor-selling: someone who owns rental property today.
const INVESTOR_SELLER_TAGS = [
  "multifamily",
  "landlords",
  "small-portfolio",
  "rental-investment",
  "buy-and-hold",
];

// Capital and development.
const CAPITAL_TAGS = [
  "development",
  "mixed-use",
  "industrial",
  "industrial-real-estate",
  "commercial-real-estate",
  "office-market",
  "office-development",
  "office-conversion",
  "adaptive-reuse",
  "data-centers",
  "logistics",
  "institutional-investment",
  "institutional-real-estate",
  "capital-markets",
  "investment",
  "retail-leasing",
  "brownfield",
  "healthcare-real-estate",
];
const CAPITAL_CATEGORIES = [
  "development",
  "commercial",
  "commercial-real-estate",
  "economic impact",
  "investment",
];

export type ResolveArticleCtaOptions = {
  /**
   * Returns true when the area slug maps to a real, followable area hub.
   * The caller supplies this so the matcher stays a pure function.
   */
  isFollowableArea?: (slug: string) => boolean;
};

export function resolveArticleCta(
  taxonomy: ArticleCtaTaxonomy,
  options: ResolveArticleCtaOptions = {},
): ArticleCta {
  const isFollowableArea = options.isFollowableArea ?? (() => true);
  const category = normalize(taxonomy.category);
  const topic = normalize(taxonomy.topic_slug);
  const area = normalize(taxonomy.area_slug);
  const tags = tagSet(taxonomy);
  const hasSpecificArea = Boolean(area) && !GENERIC_AREAS.has(area);

  // 1. Neighborhood lane. The editorial Neighborhoods beat is written for
  // people who follow one place, so the next action is following that place.
  // An area we cannot name is not an area a reader can follow, so those stories
  // fall through to the next matching funnel instead.
  const isNeighborhoodStory = category === "neighborhoods" || tags.has("neighborhood");
  if (isNeighborhoodStory && hasSpecificArea && isFollowableArea(area)) {
    return { kind: "area_follow", funnel: "area_follow", ctaId: "article-cta-area-follow", areaSlug: area };
  }

  // 2. Renter-relevant.
  if (RENTER_CATEGORIES.includes(category) || hasAny(tags, RENTER_TAGS)) {
    return {
      kind: "link",
      funnel: "renter",
      ctaId: "article-cta-renter",
      eyebrow: "Renting in Columbus",
      heading: "Looking for a place to rent?",
      body:
        "Tell us your budget and the areas you like. We send you Columbus rentals that fit what you can actually spend. Renters pay us nothing.",
      actionLabel: "Find a rental",
      href: "/rent/find-a-home",
    };
  }

  // 3. Market data, home sales, ownership.
  if (
    SELLER_CATEGORIES.includes(category) ||
    topic === "market-trends" ||
    hasAny(tags, SELLER_TAGS)
  ) {
    return {
      kind: "link",
      funnel: "home_seller",
      ctaId: "article-cta-home-seller",
      eyebrow: "Selling your home",
      heading: "Thinking about selling?",
      body:
        "Get a free offer on your Columbus home from local buyers. No 6% commission. On a $300,000 home that is roughly $18,000 that stays in your pocket. You pick the closing date.",
      note: "The offer is free and there is no obligation.",
      actionLabel: "Get my free offer",
      href: "/sell/your-home",
    };
  }

  // 4a. Rental-property owners.
  if (hasAny(tags, INVESTOR_SELLER_TAGS)) {
    return {
      kind: "link",
      funnel: "investor_seller",
      ctaId: "article-cta-investor-seller",
      eyebrow: "Selling a rental",
      heading: "Own a Columbus rental you are ready to let go?",
      body:
        "We buy rentals and small portfolios straight from owners. As-is, tenants and all. No listing, no showings, no 6% commission.",
      note: "One conversation, one offer, your decision.",
      actionLabel: "Get an offer on your rental",
      href: "/sell/investment-property",
    };
  }

  // 4b. Development and capital.
  if (CAPITAL_CATEGORIES.includes(category) || topic === "development" || hasAny(tags, CAPITAL_TAGS)) {
    return {
      kind: "link",
      funnel: "capital",
      ctaId: "article-cta-capital",
      eyebrow: "Investing in Columbus",
      heading: "Have capital ready for Central Ohio real estate?",
      body:
        "Tell us what you want your money doing and we will bring you Columbus opportunities that match. We only work in Central Ohio, and we tell you what does not fit.",
      note: "This is educational and is not an offer to sell or a solicitation to buy any security. We never promise returns.",
      actionLabel: "Start the conversation",
      href: "/invest/deploy-capital",
    };
  }

  // 5. Fallback: free membership.
  return {
    kind: "link",
    funnel: "membership",
    ctaId: "article-cta-membership",
    eyebrow: "Free membership",
    heading: "Keep up with your part of Columbus",
    body:
      "Save the areas and topics you care about. Your picks shape what we cover next, and we email you when the Columbus brief starts going out.",
    note: "Free. The brief has not launched yet, so nothing lands in your inbox until it does.",
    actionLabel: "Save my areas and topics",
    href: "/subscribe?source=article-cta",
  };
}
