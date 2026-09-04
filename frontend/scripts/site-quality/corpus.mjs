// The set of pages the suite inspects, derived from the target's own sitemap.
//
// Using the live sitemap rather than a hardcoded list is the point: the sitemap
// is what we ask Google to index, so "every URL we publish is reachable,
// canonical, and indexable" is exactly the claim worth testing. A hardcoded
// list would silently stop covering pages the moment someone adds a route.

import { FUNNEL_PATHS } from "../funnel-lib.mjs";
import { PRODUCTION_ORIGIN, url as targetUrl } from "./target.mjs";

/** Pages that must always be inspected, sitemap or not. */
export const CRITICAL_PATHS = [
  "/",
  "/blog",
  "/areas",
  "/topics",
  "/market-data",
  "/about",
  "/newsroom",
  "/editorial-standards",
  "/contact",
  "/subscribe",
  "/policies",
  "/lead-disclosure",
  ...FUNNEL_PATHS,
];

export function classifyPath(path) {
  if (path.startsWith("/blog/") && path !== "/blog/") return "article";
  if (path.startsWith("/areas/") && path !== "/areas/") return "area";
  if (path.startsWith("/topics/") && path !== "/topics/") return "topic";
  return "static";
}

export function parseSitemapUrls(xml) {
  const urls = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let match;
  while ((match = re.exec(xml)) !== null) urls.push(match[1].trim());
  return urls;
}

export function pathFromUrl(value, origin, alsoAccept = []) {
  try {
    const parsed = new URL(value);
    if (parsed.origin !== origin && !alsoAccept.includes(parsed.origin)) return null;
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return null;
  }
}

/**
 * Origins whose sitemap entries count as "this site" for a given target.
 *
 * A local `next start` serves a sitemap full of ABSOLUTE PRODUCTION URLs,
 * because `metadataBase` is the production origin and has to be — the sitemap
 * we publish must name the URLs Google should index, not localhost. Before this
 * existed, `--target local` therefore matched zero sitemap URLs and silently
 * fell back to the 16 CRITICAL_PATHS, so a local run inspected a third of the
 * pages a production run did while reporting the same confident PASS lines.
 * Production stays strict: there, an off-origin sitemap URL is a real defect.
 */
export function acceptedOrigins(target) {
  return target.isProduction ? [] : [PRODUCTION_ORIGIN];
}

/**
 * Deterministic sampling: sort, then take every Nth item. Stable across runs
 * (so a flake is reproducible) and spread across the corpus (so it is not
 * always the same ten newest articles).
 */
export function sample(items, limit) {
  const sorted = [...items].sort();
  if (limit <= 0 || sorted.length <= limit) return sorted;
  const step = sorted.length / limit;
  const picked = [];
  for (let index = 0; index < limit; index += 1) picked.push(sorted[Math.floor(index * step)]);
  return [...new Set(picked)];
}

/**
 * @returns {Promise<{ok: boolean, reason: string|null, sitemapUrls: string[],
 *   paths: string[], byKind: Record<string, string[]>, sampled: boolean}>}
 */
export async function loadCorpus(http, target, { articles = 8, areas = 5, topics = 3, full = false } = {}) {
  const response = await http.get(targetUrl(target, "/sitemap.xml"));
  if (!response.ok) {
    return {
      ok: false,
      reason: response.error
        ? `sitemap.xml unreachable (${response.error})`
        : `sitemap.xml returned HTTP ${response.status}`,
      sitemapUrls: [],
      paths: [...CRITICAL_PATHS],
      byKind: { static: [...CRITICAL_PATHS], article: [], area: [], topic: [] },
      sampled: false,
    };
  }

  const sitemapUrls = parseSitemapUrls(response.text);
  const alsoAccept = acceptedOrigins(target);
  const byKind = { static: [], article: [], area: [], topic: [] };
  for (const entry of sitemapUrls) {
    const path = pathFromUrl(entry, target.origin, alsoAccept);
    if (!path) continue;
    byKind[classifyPath(path)].push(path);
  }

  const chosen = {
    static: [...new Set([...byKind.static, ...CRITICAL_PATHS])].sort(),
    article: full ? [...byKind.article].sort() : sample(byKind.article, articles),
    area: full ? [...byKind.area].sort() : sample(byKind.area, areas),
    topic: full ? [...byKind.topic].sort() : sample(byKind.topic, topics),
  };

  return {
    ok: true,
    reason: null,
    sitemapUrls,
    byKind,
    chosen,
    paths: [...new Set([...chosen.static, ...chosen.article, ...chosen.area, ...chosen.topic])],
    sampled: !full,
  };
}
