// Missing sources.
//
// CLAUDE.md: "Every fact in a published article must be traceable to a specific
// fetched source." scripts/editorial-quality-lib.mjs enforces that at publish
// time (A4_SOURCE_FLOOR: two independent fetched sources on two domains, at
// least one primary, visibly cited in the body). Nothing re-checks it
// afterwards, and an edit through the admin panel can strip a citation without
// tripping any gate — so this is the standing product-layer version of A4.
//
// Blocking half:  a live article that cites NOTHING.
// Advisory half:  a live article below the A4 two-domain floor. Advisory
//                 because articles published before that gate existed are
//                 grandfathered; a regression should be visible, not fatal.

import { openDatabase } from "../db.mjs";
import { fail, pass, skip } from "../result.mjs";

const ID = "sources";
const TITLE = "Article source citations";
const OWN_HOSTS = new Set(["columbusrealestatenews.com", "www.columbusrealestatenews.com"]);

/** Every http(s) URL a markdown body links to or prints. */
export function bodyUrls(body) {
  if (typeof body !== "string") return [];
  const urls = new Set();
  const markdown = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = markdown.exec(body)) !== null) urls.add(match[1]);
  const bare = /(?<!\]\()\bhttps?:\/\/[^\s)<>"']+/g;
  while ((match = bare.exec(body)) !== null) urls.add(match[0]);
  return [...urls];
}

/** Distinct off-site hostnames a body cites, lowercased and www-stripped. */
export function citedDomains(body) {
  const domains = new Set();
  for (const value of bodyUrls(body)) {
    let host;
    try {
      host = new URL(value).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (OWN_HOSTS.has(host)) continue;
    domains.add(host.replace(/^www\./, ""));
  }
  return [...domains];
}

export const sources = {
  id: ID,
  title: TITLE,
  blocking: true,
  async run() {
    const { sql, reason } = await openDatabase();
    if (!sql) return skip(ID, TITLE, true, reason);

    const articles = await sql`
      SELECT id, title, canonical_slug, body
      FROM articles
      WHERE status = 'live'
      ORDER BY created_at DESC
    `;

    const uncited = [];
    const thin = [];
    for (const article of articles) {
      const domains = citedDomains(article.body);
      const slug = article.canonical_slug || article.id;
      if (domains.length === 0) {
        uncited.push(`/blog/${slug} — "${article.title}" cites no source at all`);
      } else if (domains.length < 2) {
        thin.push(`/blog/${slug} — one source domain only (${domains[0]}); A4 floor is two`);
      }
    }

    const stats = { liveArticles: articles.length, uncited: uncited.length, belowFloor: thin.length };
    if (uncited.length > 0) {
      return fail(
        ID,
        TITLE,
        true,
        `${uncited.length} of ${articles.length} live article(s) cite no source`,
        [...uncited, ...thin],
        stats,
      );
    }
    if (thin.length > 0) {
      // Advisory: below the A4 floor but not uncited. Reported as a FAIL so it
      // is impossible to miss, marked non-blocking so it cannot wedge a deploy
      // on articles that predate the gate.
      return fail(
        ID,
        TITLE,
        false,
        `${thin.length} of ${articles.length} live article(s) sit below the A4 two-domain source floor`,
        thin,
        stats,
      );
    }
    return pass(ID, TITLE, true, `all ${articles.length} live article(s) cite at least two source domains`, stats);
  },
};
