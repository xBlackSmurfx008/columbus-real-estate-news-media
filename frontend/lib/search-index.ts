import type { DbArticle } from "@/lib/public-data";
import type { Area, Topic } from "@/lib/types";

export type SearchResultKind = "area" | "topic" | "article" | "resource";

export type IndexedSearchSuggestion = {
  id: string;
  label: string;
  href: string;
  type: SearchResultKind;
  description?: string;
  searchText: string;
};

export const AREA_SEARCH_ALIASES: Partial<Record<string, string>> = {
  "arena-district": "43215 downtown columbus nationwide arena park street entertainment apartments restaurants",
  clintonville: "43202 north columbus high street ravines indianola worthington families renters",
  "downtown-columbus": "43215 downtown cbd capitol square discovery district arena district apartments offices restaurants events",
  dublin: "43016 43017 bridge park riverside crossing northwest columbus relocation schools apartments homes",
  "easton-area": "43219 easton town center northeast columbus shopping restaurants hotels apartments jobs corridor",
  franklinton: "43215 43222 west columbus scioto peninsula arts development rentals downtown adjacent",
  "german-village": "43206 brewery district merion village schiller park brick streets restaurants historic homes",
  hilltop: "43204 west columbus west side homes rentals broad street",
  "ohio-state-university-area": "43201 osu campus off campus student rentals university district north campus south campus",
  "polaris-area": "43082 43240 polaris fashion place north columbus shopping restaurants apartments jobs corridor",
  "short-north": "43201 43215 arts district high street restaurants galleries apartments italian village victorian village",
  "upper-arlington": "43220 43221 ua northwest columbus schools lane avenue homes",
  "westgate-west-scioto": "43204 westgate west scioto west columbus west side homes rentals",
  westerville: "43081 43082 uptown westerville northeast columbus homes apartments schools",
};

export const RESOURCE_SEARCH_SUGGESTIONS: IndexedSearchSuggestion[] = [
  {
    id: "resource-housing-search",
    label: "Housing Search Center",
    href: "/housing-search",
    type: "resource",
    description: "Compare portals for homes, rentals, selling paths, and rental advertising.",
    searchText: "housing search buy rent apartments homes listings rentals portal zillow redfin realtor apartments.com 43204 43215 43201",
  },
  {
    id: "resource-directory",
    label: "Local Business and Home Services Directory",
    href: "/directory",
    type: "resource",
    description: "Find service categories, local living categories, and listing review rules.",
    searchText: "directory restaurants coffee home services contractors hvac plumbing childcare local businesses sponsors providers food drink attractions",
  },
  {
    id: "resource-things-to-do",
    label: "Things To Do",
    href: "/things-to-do",
    type: "resource",
    description: "Explore events, festivals, parks, family activities, arts, and entertainment.",
    searchText: "things to do events weekend festivals markets family activities parks arts entertainment restaurants openings",
  },
  {
    id: "resource-renter-checklist",
    label: "Before You Sign Checklist",
    href: "/rent/before-you-sign",
    type: "resource",
    description: "Renter due diligence for fees, lease terms, owner checks, and scam signals.",
    searchText: "renter checklist lease fees scam due diligence before you sign apartments rentals application deposit landlord",
  },
  {
    id: "resource-price-band",
    label: "Buyer Price-Band Reality",
    href: "/buy/price-band-reality",
    type: "resource",
    description: "Compare affordability tradeoffs before locking onto one area.",
    searchText: "buyer price band affordability mortgage monthly payment budget home search substitutions",
  },
  {
    id: "resource-market-data",
    label: "Market Data",
    href: "/market-data",
    type: "resource",
    description: "Read only sourced market observations once data is verified.",
    searchText: "market data prices rent inventory observations sales trends sourced verified geography",
  },
  {
    id: "resource-resources",
    label: "Housing Resources",
    href: "/resources",
    type: "resource",
    description: "Practical links for public records, permits, schools, utilities, and housing decisions.",
    searchText: "resources public records permits schools utilities property records taxes housing help",
  },
  {
    id: "resource-subscribe",
    label: "Follow Areas and Topics",
    href: "/subscribe",
    type: "resource",
    description: "Save preferences for a CREN brief by area, topic, cadence, and role.",
    searchText: "subscribe follow alert alerts newsletter weekly brief area topic save preferences",
  },
  {
    id: "resource-saved",
    label: "Saved Items",
    href: "/saved",
    type: "resource",
    description: "Review areas, topics, stories, and searches saved in this browser.",
    searchText: "saved items save search wishlist favorites my cren brief follow",
  },
];

export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function areaSearchText(area: Area): string {
  return normalizeSearchText([
    area.name,
    area.slug.replace(/-/g, " "),
    area.kind,
    area.description,
    area.populationSignal,
    area.multiCountyNote,
    AREA_SEARCH_ALIASES[area.slug],
  ].filter(Boolean).join(" "));
}

export function topicSearchText(topic: Topic): string {
  return normalizeSearchText([topic.name, topic.slug.replace(/-/g, " "), topic.description].join(" "));
}

export function articleSearchText(article: Pick<DbArticle, "title" | "excerpt" | "category" | "area_slug" | "topic_slug" | "tags">): string {
  return normalizeSearchText([
    article.title,
    article.excerpt,
    article.category,
    article.area_slug?.replace(/-/g, " "),
    article.topic_slug?.replace(/-/g, " "),
    ...(article.tags ?? []),
  ].filter(Boolean).join(" "));
}

export function searchTextMatches(searchText: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => searchText.includes(token));
}
