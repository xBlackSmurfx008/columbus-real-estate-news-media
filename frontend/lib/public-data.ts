import { cache } from "react";
import { getDb } from "@/lib/db";
import snapshotJson from "@/content/snapshot/public-data.json";
import { generateArticleSlug, getArticleSlug } from "@/lib/article-routing";
import { getBlogPostBySlug } from "@/lib/blog";

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
  canonical_slug?: string | null;
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

export interface DbMarketObservation {
  id: number;
  metric_key: string;
  label: string;
  value_display: string;
  value_numeric: string | null;
  unit: string | null;
  geography_type: string;
  geography_slug: string;
  geography_label: string;
  property_type: string;
  period_start: string | null;
  period_end: string;
  as_of_date: string;
  source_name: string;
  source_url: string;
  methodology_url: string | null;
  notes: string | null;
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

export interface ArticleSlugResolution {
  article: DbArticle;
  canonicalSlug: string;
  shouldRedirect: boolean;
}

const snapshot = snapshotJson as unknown as PublicSiteData;
const legacyArticleSlugRedirects: Record<string, string> = {
  "columbus-zone-in-phase-2-commercial-industrial-rezoning": "zone-in-adds-capacity-not-88-000-built-columbus-homes",
};

function snapshotArticles(): DbArticle[] {
  return Array.isArray(snapshot.articles) ? snapshot.articles : [];
}

// List-shaped consumers must never receive article bodies, exactly as their
// database queries already guarantee with `NULL AS body`. The snapshot keeps
// full bodies on purpose so getArticleById/getArticleBySlug can still render a
// real article page during an outage - but /api/public is fetched by the site
// header on every page load, and shipping 80 bodies through it is the transfer
// pattern that exhausted the Neon plan quota on 2026-08-24. Without this the
// fallback path silently undoes the query-level fix.
function snapshotArticlesWithoutBodies(): DbArticle[] {
  return snapshotArticles().map((article) => ({ ...article, body: null }));
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
                   canonical_slug,
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
      articles: snapshotArticlesWithoutBodies(),
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

/** Resolve a canonical or historical article slug without loading every body. */
export const resolveArticleSlug = cache(async (slug: string): Promise<ArticleSlugResolution | null> => {
  const redirectedSlug = legacyArticleSlugRedirects[slug];
  if (redirectedSlug) {
    return resolveArticleSlug(redirectedSlug);
  }

  try {
    const sql = getDb();
    const canonicalRows = await sql`
      SELECT * FROM articles
      WHERE canonical_slug = ${slug} AND status = 'live'
      LIMIT 1
    `;
    if (canonicalRows.length > 0) {
      const article = canonicalRows[0] as unknown as DbArticle;
      return { article, canonicalSlug: getArticleSlug(article), shouldRedirect: false };
    }

    const redirectRows = await sql`
      SELECT articles.*
      FROM article_slug_redirects
      JOIN articles ON articles.id = article_slug_redirects.article_id
      WHERE article_slug_redirects.slug = ${slug} AND articles.status = 'live'
      LIMIT 1
    `;
    if (redirectRows.length > 0) {
      const article = redirectRows[0] as unknown as DbArticle;
      return { article, canonicalSlug: getArticleSlug(article), shouldRedirect: true };
    }

    // Retain ID/title compatibility until every historical link is backfilled.
    const byId = await sql`SELECT * FROM articles WHERE id = ${slug} AND status = 'live'`;
    if (byId.length > 0) {
      const article = byId[0] as unknown as DbArticle;
      return { article, canonicalSlug: getArticleSlug(article), shouldRedirect: true };
    }

    const titles = await sql`SELECT id, title, canonical_slug FROM articles WHERE status = 'live'`;
    const match = (titles as unknown as Array<Pick<DbArticle, 'id' | 'title' | 'canonical_slug'>>).find(
      (article) => generateArticleSlug(article.title) === slug,
    );
    if (!match) return null;
    const rows = await sql`SELECT * FROM articles WHERE id = ${match.id} AND status = 'live'`;
    const article = (rows[0] as unknown as DbArticle) ?? null;
    if (!article) return null;
    const canonicalSlug = getArticleSlug(article);
    return { article, canonicalSlug, shouldRedirect: canonicalSlug !== slug };
  } catch (error) {
    logDbFallback("resolveArticleSlug", error);
    const articles = snapshotArticles();
    const article = articles.find((a) => a.id === slug)
      ?? articles.find((a) => getArticleSlug(a) === slug)
      ?? articles.find((a) => generateArticleSlug(a.title) === slug)
      ?? null;
    if (!article) return null;
    const canonicalSlug = getArticleSlug(article);
    return { article, canonicalSlug, shouldRedirect: canonicalSlug !== slug };
  }
});

/** Fetch a single article while preserving the legacy public API. */
export const getArticleBySlug = cache(async (slug: string): Promise<DbArticle | null> => {
  const resolution = await resolveArticleSlug(slug);
  if (resolution?.article) return resolution.article;

  const blogPost = getBlogPostBySlug(slug);
  if (!blogPost) return null;

  return {
    id: blogPost.slug,
    canonical_slug: blogPost.slug,
    status: "live",
    featured: false,
    category: blogPost.format,
    category_class: "card-img-market",
    icon: "●",
    title: blogPost.title,
    excerpt: blogPost.excerpt,
    body: [
      `## ${blogPost.introHook}`,
      ...blogPost.whatChanged.map((point) => `- ${point}`),
    ].join("\n\n"),
    author: "CREN Newsroom",
    date: blogPost.date,
    read_time: `${blogPost.readTimeMinutes} min read`,
    area_slug: blogPost.areaSlug,
    topic_slug: blogPost.topicSlug,
    tags: [blogPost.topicSlug, blogPost.areaSlug].filter(Boolean) as string[],
    image_url: null,
    image_alt: null,
    image_caption: null,
    meta_description: blogPost.excerpt,
    fact_checked_at: null,
    created_at: `${blogPost.date}T00:00:00.000Z`,
    updated_at: `${blogPost.date}T00:00:00.000Z`,
  } as DbArticle;
});

/** @deprecated Import generateArticleSlug from article-routing instead. */
export const generateSlug = generateArticleSlug;

/** Get only articles (for blog pages) — no bodies */
export const getArticles = cache(async (): Promise<DbArticle[]> => {
  try {
    const sql = getDb();
    const rows = await sql`SELECT id, status, featured, category, category_class, icon, title, excerpt, NULL AS body,
                                  canonical_slug,
                                  author, date, read_time, area_slug, topic_slug, tags, image_url, image_alt,
                                  image_caption, meta_description, fact_checked_at, created_at, updated_at
                           FROM articles WHERE status = 'live' ORDER BY created_at DESC`;
    return rows as unknown as DbArticle[];
  } catch (error) {
    logDbFallback("getArticles", error);
    return snapshotArticlesWithoutBodies();
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

/** Return the latest verified, source-aware metric rows for one area. */
export const getAreaMarketObservations = cache(async (areaSlug: string): Promise<DbMarketObservation[]> => {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT DISTINCT ON (market_observations.metric_key, market_observations.property_type)
        market_observations.id,
        market_observations.metric_key,
        market_observations.label,
        market_observations.value_display,
        market_observations.value_numeric,
        market_observations.unit,
        market_observations.geography_type,
        market_observations.geography_slug,
        market_observations.geography_label,
        market_observations.property_type,
        TO_CHAR(market_observations.period_start, 'YYYY-MM-DD') AS period_start,
        TO_CHAR(market_observations.period_end, 'YYYY-MM-DD') AS period_end,
        TO_CHAR(market_observations.as_of_date, 'YYYY-MM-DD') AS as_of_date,
        market_sources.name AS source_name,
        market_observations.source_url,
        COALESCE(market_observations.methodology_url, market_sources.methodology_url) AS methodology_url,
        market_observations.notes
      FROM market_observations
      JOIN market_sources ON market_sources.slug = market_observations.source_slug
      WHERE market_observations.geography_slug = ${areaSlug}
        AND market_observations.quality_status = 'verified'
        AND market_sources.active = true
      ORDER BY
        market_observations.metric_key,
        market_observations.property_type,
        market_observations.period_end DESC,
        market_observations.updated_at DESC
    `;
    return rows as unknown as DbMarketObservation[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[public-data] DB unavailable in getAreaMarketObservations; hiding unverified area metrics: ${message}`);
    return [];
  }
});

/** Return the latest verified, source-aware metric row for each metric, area, and property type. */
export const getLatestMarketObservations = cache(async (): Promise<DbMarketObservation[]> => {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT DISTINCT ON (
        market_observations.metric_key,
        market_observations.geography_slug,
        market_observations.property_type
      )
        market_observations.id,
        market_observations.metric_key,
        market_observations.label,
        market_observations.value_display,
        market_observations.value_numeric,
        market_observations.unit,
        market_observations.geography_type,
        market_observations.geography_slug,
        market_observations.geography_label,
        market_observations.property_type,
        TO_CHAR(market_observations.period_start, 'YYYY-MM-DD') AS period_start,
        TO_CHAR(market_observations.period_end, 'YYYY-MM-DD') AS period_end,
        TO_CHAR(market_observations.as_of_date, 'YYYY-MM-DD') AS as_of_date,
        market_sources.name AS source_name,
        market_observations.source_url,
        COALESCE(market_observations.methodology_url, market_sources.methodology_url) AS methodology_url,
        market_observations.notes
      FROM market_observations
      JOIN market_sources ON market_sources.slug = market_observations.source_slug
      WHERE market_observations.quality_status = 'verified'
        AND market_sources.active = true
      ORDER BY
        market_observations.metric_key,
        market_observations.geography_slug,
        market_observations.property_type,
        market_observations.period_end DESC,
        market_observations.updated_at DESC
    `;
    return rows as unknown as DbMarketObservation[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[public-data] DB unavailable in getLatestMarketObservations; hiding unverified market metrics: ${message}`);
    return [];
  }
});
