import { Area, BlogPost, ContentItem, Topic } from "@/lib/types";
import { blogPosts } from "@/lib/blog";
import {
  AREA_SECTION_LABELS,
  AREA_SECTION_ORDER,
  franklinSeedsToAreas,
  FEATURED_AREA_SLUGS,
} from "@/lib/franklin-areas";

/** Richer blurbs for high-traffic hubs; merged onto Franklin seed data by slug. */
const areaEditorialOverrides: Partial<Record<string, Partial<Pick<Area, "description" | "populationSignal">>>> = {
  "upper-arlington": {
    description: "Schools, pricing trends, and local development.",
    populationSignal: "High family demand",
  },
  dublin: {
    description: "New builds, premium neighborhoods, and lifestyle growth.",
    populationSignal: "Executive relocation interest",
  },
  "grove-city": {
    description: "Affordability movement and first-time buyer activity.",
    populationSignal: "Value-oriented demand",
  },
  westerville: {
    description: "Inventory shifts and commuting-driven demand.",
    populationSignal: "Steady owner-occupier interest",
  },
  "columbus-citywide": {
    description: "Metro-wide policy, market, and development signals.",
    populationSignal: "Broad mixed demand",
  },
  gahanna: {
    description: "East-side growth, airport corridor demand, and infill activity.",
    populationSignal: "Strong renter and owner interest",
  },
};

function mergeAreas(base: Area[]): Area[] {
  const bySlug = new Map<string, Area>();
  for (const a of base) {
    const o = areaEditorialOverrides[a.slug];
    bySlug.set(a.slug, o ? { ...a, ...o } : a);
  }
  return Array.from(bySlug.values()).sort((x, y) => x.name.localeCompare(y.name));
}

export const areas: Area[] = mergeAreas(franklinSeedsToAreas());

export const featuredAreas: Area[] = FEATURED_AREA_SLUGS.map((slug) => {
  const a = areas.find((x) => x.slug === slug);
  if (!a) throw new Error(`Missing featured area: ${slug}`);
  return a;
});

export const topics: Topic[] = [
  { slug: "market-trends", name: "Market Trends", description: "Pricing, inventory, and demand changes." },
  { slug: "schools", name: "Schools", description: "School updates and district-level context for housing decisions." },
  { slug: "development", name: "Development", description: "Projects, permits, and construction pipeline movement." },
  { slug: "local-politics", name: "Local Politics", description: "Policy shifts affecting housing and neighborhoods." },
  { slug: "events-lifestyle", name: "Events & Lifestyle", description: "Events, dining, and entertainment shaping local demand." },
];

function postToContentItem(post: BlogPost): ContentItem {
  return {
    slug: post.slug,
    title: post.title,
    areaSlug: post.areaSlug,
    topicSlug: post.topicSlug,
    format: post.format,
    excerpt: post.excerpt,
    date: post.date,
  };
}

export const allStoryItems: ContentItem[] = blogPosts.map(postToContentItem);

export const getAreaBySlug = (slug: string) => areas.find((a) => a.slug === slug);
export const getTopicBySlug = (slug: string) => topics.find((t) => t.slug === slug);

export function areasGroupedBySection(): Record<string, Area[]> {
  const map: Record<string, Area[]> = {};
  for (const k of AREA_SECTION_ORDER) {
    map[AREA_SECTION_LABELS[k]] = [];
  }
  for (const a of areas) {
    const kind = a.kind ?? "city";
    const label = AREA_SECTION_LABELS[kind];
    map[label]!.push(a);
  }
  for (const k of AREA_SECTION_ORDER) {
    const label = AREA_SECTION_LABELS[k];
    map[label]!.sort((x, y) => x.name.localeCompare(y.name));
  }
  return map;
}

export const priorityAreaHubs = areas.map((area) => area.slug);
export const priorityTopicHubs = ["market-trends", "development", "schools"];
