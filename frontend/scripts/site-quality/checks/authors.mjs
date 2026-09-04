// Duplicate / invalid author names.
//
// scripts/newsroom-authors.mjs is the approved-byline list and the publish gate
// already enforces it on the way in. This check is the standing product-layer
// version: it re-derives the answer from what is actually LIVE, because a byline
// can also change after publication (an admin edit, a direct UPDATE, a restored
// backup) and nothing else would notice.
//
// Three distinct defects, all blocking:
//   1. a live byline that is not on the approved list
//   2. a known historical alias that slipped back in
//   3. two bylines that are the same identity spelled differently — the
//      "duplicate" half. Normalizing to letters-only catches "CREN Newsroom"
//      vs "CREN  newsroom" vs "cren-newsroom" before they become six variants
//      again.

import { APPROVED_AUTHORS, NEWSROOM_AUTHOR_ALIASES, isApprovedAuthor } from "../../newsroom-authors.mjs";
import { openDatabase } from "../db.mjs";
import { htmlPages } from "../pages.mjs";
import { textContent } from "../html.mjs";
import { fail, skip, verdict } from "../result.mjs";

const ID = "authors";
const TITLE = "Author taxonomy";

export function normalizeByline(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Distinct raw bylines that collapse onto the same normalized identity. */
export function duplicateGroups(bylines) {
  const groups = new Map();
  for (const byline of bylines) {
    const key = normalizeByline(byline);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(byline);
  }
  return [...groups.entries()]
    .filter(([, variants]) => variants.size > 1)
    .map(([key, variants]) => ({ key, variants: [...variants].sort() }));
}

export const authors = {
  id: ID,
  title: TITLE,
  blocking: true,
  async run() {
    const { sql, reason } = await openDatabase();
    if (!sql) return skip(ID, TITLE, true, reason);

    const rows = await sql`
      SELECT author, COUNT(*)::int AS n
      FROM articles
      WHERE status = 'live'
      GROUP BY author
      ORDER BY n DESC
    `;
    if (rows.length === 0) return fail(ID, TITLE, true, "no live articles found", ["articles table has no live rows"]);

    const findings = [];
    for (const row of rows) {
      const byline = row.author;
      if (NEWSROOM_AUTHOR_ALIASES.includes(String(byline ?? "").trim())) {
        findings.push(`"${byline}" (${row.n} article(s)) is a retired newsroom alias; canonical byline is "${APPROVED_AUTHORS[0]}"`);
      } else if (!isApprovedAuthor(byline)) {
        findings.push(`"${byline}" (${row.n} article(s)) is not on the approved byline list in scripts/newsroom-authors.mjs`);
      }
      if (typeof byline === "string" && byline !== byline.trim()) {
        findings.push(`"${byline}" carries leading/trailing whitespace`);
      }
    }
    for (const group of duplicateGroups(rows.map((row) => row.author))) {
      findings.push(`duplicate identity spelled ${group.variants.length} ways: ${group.variants.map((v) => `"${v}"`).join(" / ")}`);
    }

    return verdict(
      ID,
      TITLE,
      true,
      findings,
      `${rows.length} live byline(s), all approved: ${rows.map((row) => `${row.author} (${row.n})`).join(", ")}`,
      `${findings.length} byline problem(s) across ${rows.length} distinct live byline(s)`,
      { bylines: rows },
    );
  },
};

export const renderedBylines = {
  id: "authors-rendered",
  title: "Approved byline is what the page actually shows",
  blocking: false,
  async run(context) {
    const usable = htmlPages(context.pages);
    const articlePaths = [...usable.keys()].filter((path) => path.startsWith("/blog/"));
    if (articlePaths.length === 0) {
      return skip("authors-rendered", "Approved byline is what the page actually shows", false, "no article page in the sample rendered as HTML");
    }

    const findings = [];
    for (const path of articlePaths) {
      const text = textContent(usable.get(path).text);
      const shown = APPROVED_AUTHORS.some((author) => text.includes(author));
      const alias = NEWSROOM_AUTHOR_ALIASES.find((name) => text.includes(name));
      if (alias) findings.push(`${path} renders the retired byline "${alias}"`);
      else if (!shown) findings.push(`${path} does not render any approved byline`);
    }

    return verdict(
      "authors-rendered",
      "Approved byline is what the page actually shows",
      false,
      findings,
      `all ${articlePaths.length} sampled article page(s) render an approved byline`,
      `${findings.length} of ${articlePaths.length} sampled article page(s) render a wrong or missing byline`,
      { sampled: articlePaths.length },
    );
  },
};
