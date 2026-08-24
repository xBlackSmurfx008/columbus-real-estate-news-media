import { cache } from "react";
import { getDb } from "@/lib/db";
import snapshotJson from "@/content/snapshot/public-data.json";

// ============================================================
// Server-side data fetching for public pages
//
// Two operating rules, learned from the 2026-08-24 outage:
//
// 1. Never let a database failure blank the site. Every public
//    getter falls back to the committed last-known-good snapshot
//    (content/snapshot/public-data.json, refreshed by
//    scripts/export-content-snapshot.mjs whenever the DB is
//    healthy). ISR previously cached the empty error-state as if
//    it were real content.
//
// 2. Never pull article bodies for list views. Bodies are the
//    bulk of the table; list queries select every column except
//    body, and slug resolution matches on id+title only before
//    fetching the single article it needs. This keeps Neon data
//    transfer inside plan limits.
// ============================================================

export interface DbArticle {
  id: string;
  status: string;
  featured: boolean;
  category: string;
  category_class: string;
  icon: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  author: string;
  date: string;
  read_time: string;
  area_slug: string | null;
  topic_slug: string | null;
  tags: string[];
  image_url: string | null;
  image_alt: string | null;
  image_caption: string | null;
  meta_description: string | null;
  fact_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMarketSnapshot {
  id: number;
  label: string;
  value: string;
  change: string;
  direction: string;
  sort_order: number;
}

export interface DbHeroStat {
  id: number;
  value: string;
  label: string;
  sort_order: number;
}

export interface DbNeighborhood {
  id: number;
  name: string;
  median: string;
  yoy: string;
  rent: string;
  dom: string;
  inventory: string;
  sort_order: number;
}

export interface DbAd {
  id: string;
  name: string;
  type: string;
  status: string;
  placement: string;
  size: string | null;
  image_url: string | null;
  link_url: string | null;
  html_content: string | null;
  alt_text: string | null;
  title: string | null;
  text: string | null;
  cta_text: string | null;
  cta_url: string | null;
  brand_name: string | null;
  brand_color: string | null;
}

export interface DbTicker {
  id: number;
  text: string;
  active: boolean;
  sort_order: number;
}

export interface DbTestimonial {
  id: number;
  initials: string;
  name: string;
  role: string;
  quote: string;
  sort_order: number;
}

export interface DbInterview {
  id: string;
  name: string;
  initials: string;
  role: string;
  topic: string | null;
  status: string;
  date: string;
  sort_order: number;
}

export interface PublicSiteData {
  articles: DbArticle[];
  ads: DbAd[];
  marketSnapshot: DbMarketSnapshot[];
  heroStats: DbHeroStat[];
  neighborhoods: DbNeighborhood[];
  tickers: DbTicker[];
  interviews: DbInterview[];
  testimonials: DbTestimonial[];
  settings: Record<string, string>;
}

const snapshot = snapshotJson as unknown as PublicSiteData;

function snapshotArticles(): DbArticle[] {
  return Array.isArray(snapshot.articles) ? snapshot.articles : [];
}

function logDbFallback(where: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[public-data] DB unavailable in ${where}; serving snapshot fallback: ${message}`);
}

/** Fetch all public content from NeonDB — used in server components.
 *  Article bodies are NOT included (list contexts never render them). */
export const getPublicData = cache(async (): Promise<PublicSiteData> => {
  try {
    const sql = getDb();

    const [articles, ads, marketSnapshot, heroStats, neighborhoods, tickers, interviews, testimonials, settingsRows] =
      await Promise.all([
        sql`SELECT id, status, featured, category, category_class, icon, title, excerpt, NULL AS body,
                   author, date, read_time, area_slug, topic_slug, tags, image_url, image_alt,
                   image_caption, meta_description, fact_checked_at, created_at, updated_at
            FROM articles WHERE status = 'live' ORDER BY created_at DESC`,
        sql`SELECT * FROM ads WHERE status = 'live' ORDER BY created_at DESC`,
        sql`SELECT * FROM market_snapshot ORDER BY sort_order ASC`,
        sql`SELECT * FROM hero_stats ORDER BY sort_order ASC`,
        sql`SELECT * FROM neighborhoods ORDER BY sort_order ASC`,
        sql`SELECT * FROM ticker_items WHERE active = true ORDER BY sort_order ASC`,
        sql`SELECT * FROM interviews ORDER BY sort_order ASC`,
        sql`SELECT * FROM testimonials ORDER BY sort_order ASC`,
        sql`SELECT key, value FROM settings`,
      ]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    return {
      articles: articles as unknown as DbArticle[],
      ads: ads as unknown as DbAd[],
      marketSnapshot: marketSnapshot as unknown as DbMarketSnapshot[],
      heroStats: heroStats as unknown as DbHeroStat[],
      neighborhoods: neighborhoods as unknown as DbNeighborhood[],
      tickers: tickers as unknown as DbTicker[],
      interviews: interviews as unknown as DbInterview[],
      testimonials: testimonials as unknown as DbTestimonial[],
      settings,
    };
  } catch (error) {
    logDbFallback("getPublicData", error);
    return {
      articles: snapshotArticles(),
      ads: snapshot.ads ?? [],
      marketSnapshot: snapshot.marketSnapshot ?? [],
      heroStats: snapshot.heroStats ?? [],
      neighborhoods: snapshot.neighborhoods ?? [],
      tickers: snapshot.tickers ?? [],
      interviews: snapshot.interviews ?? [],
      testimonials: snapshot.testimonials ?? [],
      settings: snapshot.settings ?? {},
    };
  }
});

/** Fetch a single article by ID */
export const getArticleById = cache(async (id: string): Promise<DbArticle | null> => {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM articles WHERE id = ${id} AND status = 'live'`;
    if (rows.length === 0) return null;
    return rows[0] as unknown as DbArticle;
  } catch (error) {
    logDbFallback("getArticleById", error);
    return snapshotArticles().find((a) => a.id === id) ?? null;
  }
});

/** Fetch a single article by slug (generated from title).
 *  Resolves the slug against id+title only, then fetches the one
 *  matching row — never the whole table with bodies. */
export const getArticleBySlug = cache(async (slug: string): Promise<DbArticle | null> => {
  try {
    const sql = getDb();
    // First try direct ID match
    const byId = await sql`SELECT * FROM articles WHERE id = ${slug} AND status = 'live'`;
    if (byId.length > 0) return byId[0] as unknown as DbArticle;

    // Otherwise resolve the slug from titles alone, then fetch that one article
    const titles = await sql`SELECT id, title FROM articles WHERE status = 'live'`;
    const match = (titles as unknown as Array<{ id: string; title: string }>).find(
      (a) => generateSlug(a.title) === slug
    );
    if (!match) return null;
    const rows = await sql`SELECT * FROM articles WHERE id = ${match.id} AND status = 'live'`;
    return (rows[0] as unknown as DbArticle) ?? null;
  } catch (error) {
    logDbFallback("getArticleBySlug", error);
    const articles = snapshotArticles();
    return (
      articles.find((a) => a.id === slug) ??
      articles.find((a) => generateSlug(a.title) === slug) ??
      null
    );
  }
});

/** Generate a URL-friendly slug from a title */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

/** Get only articles (for blog pages) — no bodies */
export const getArticles = cache(async (): Promise<DbArticle[]> => {
  try {
    const sql = getDb();
    const rows = await sql`SELECT id, status, featured, category, category_class, icon, title, excerpt, NULL AS body,
                                  author, date, read_time, area_slug, topic_slug, tags, image_url, image_alt,
                                  image_caption, meta_description, fact_checked_at, created_at, updated_at
                           FROM articles WHERE status = 'live' ORDER BY created_at DESC`;
    return rows as unknown as DbArticle[];
  } catch (error) {
    logDbFallback("getArticles", error);
    return snapshotArticles();
  }
});

/** Get market data for display */
export const getMarketData = cache(async () => {
  try {
    const sql = getDb();
    const [snapshotRows, heroStats, neighborhoods] = await Promise.all([
      sql`SELECT * FROM market_snapshot ORDER BY sort_order ASC`,
      sql`SELECT * FROM hero_stats ORDER BY sort_order ASC`,
      sql`SELECT * FROM neighborhoods ORDER BY sort_order ASC`,
    ]);
    return {
      snapshot: snapshotRows as unknown as DbMarketSnapshot[],
      heroStats: heroStats as unknown as DbHeroStat[],
      neighborhoods: neighborhoods as unknown as DbNeighborhood[],
    };
  } catch (error) {
    logDbFallback("getMarketData", error);
    return {
      snapshot: snapshot.marketSnapshot ?? [],
      heroStats: snapshot.heroStats ?? [],
      neighborhoods: snapshot.neighborhoods ?? [],
    };
  }
});
