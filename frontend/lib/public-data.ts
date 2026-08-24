import { getDb } from "@/lib/db";

// ============================================================
// Server-side data fetching for public pages
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

/** Fetch all public content from NeonDB — used in server components */
export async function getPublicData(): Promise<PublicSiteData> {
  const sql = getDb();

  const [articles, ads, marketSnapshot, heroStats, neighborhoods, tickers, interviews, testimonials, settingsRows] =
    await Promise.all([
      // Card/list views never render the article body; selecting it here meant
      // every homepage revalidation transferred every live article in full.
      sql`SELECT id, status, featured, category, category_class, icon, title, excerpt,
                 author, date, read_time, area_slug, topic_slug, tags, image_url,
                 image_alt, image_caption, meta_description, fact_checked_at,
                 created_at, updated_at
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
}

/** Fetch a single article by ID */
export async function getArticleById(id: string): Promise<DbArticle | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM articles WHERE id = ${id} AND status = 'live'`;
  if (rows.length === 0) return null;
  return rows[0] as unknown as DbArticle;
}

/** Fetch a single article by slug (generated from title) */
export async function getArticleBySlug(slug: string): Promise<DbArticle | null> {
  const sql = getDb();
  // First try direct ID match
  const byId = await sql`SELECT * FROM articles WHERE id = ${slug} AND status = 'live'`;
  if (byId.length > 0) return byId[0] as unknown as DbArticle;

  // Otherwise resolve the slug against titles only. Article ids carry a date
  // prefix the public URL does not, so the id match above misses on every
  // normal /blog/<slug> request and this path is the one that actually runs.
  // Select just id+title here: pulling whole rows meant every article render
  // transferred every live article's full body out of the database.
  const candidates = await sql`SELECT id, title FROM articles WHERE status = 'live'`;
  const match = (candidates as unknown as Pick<DbArticle, "id" | "title">[]).find(
    (a) => generateSlug(a.title) === slug
  );
  return match ? getArticleById(match.id) : null;
}

/** Generate a URL-friendly slug from a title */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

/**
 * Get only articles (for blog pages).
 *
 * Feeds card/list views only, so `body` is deliberately not selected — callers
 * that need the full text go through getArticleById/getArticleBySlug.
 */
export async function getArticles(): Promise<DbArticle[]> {
  const sql = getDb();
  const rows = await sql`SELECT id, status, featured, category, category_class, icon, title, excerpt,
                                author, date, read_time, area_slug, topic_slug, tags, image_url,
                                image_alt, image_caption, meta_description, fact_checked_at,
                                created_at, updated_at
                         FROM articles WHERE status = 'live' ORDER BY created_at DESC`;
  return rows as unknown as DbArticle[];
}

/** Get market data for display */
export async function getMarketData() {
  const sql = getDb();
  const [snapshot, heroStats, neighborhoods] = await Promise.all([
    sql`SELECT * FROM market_snapshot ORDER BY sort_order ASC`,
    sql`SELECT * FROM hero_stats ORDER BY sort_order ASC`,
    sql`SELECT * FROM neighborhoods ORDER BY sort_order ASC`,
  ]);
  return {
    snapshot: snapshot as unknown as DbMarketSnapshot[],
    heroStats: heroStats as unknown as DbHeroStat[],
    neighborhoods: neighborhoods as unknown as DbNeighborhood[],
  };
}
