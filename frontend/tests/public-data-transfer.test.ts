import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// The 2026-08-24 Neon quota outage was caused by article bodies crossing the
// wire on every page load. The query layer fixed it with `NULL AS body`, but the
// outage-fallback snapshot deliberately keeps full bodies so an article page can
// still render during an outage. That makes the fallback path the place where
// the fix silently comes undone.

test("list-shaped snapshot fallbacks strip article bodies", async () => {
  const source = await readFile(new URL("../lib/public-data.ts", import.meta.url), "utf8");

  assert.match(source, /function snapshotArticlesWithoutBodies/);

  // getPublicData backs /api/public, which the site header fetches on every
  // render. getArticles is documented "no bodies". Both must use the stripped
  // helper in their catch blocks.
  for (const fn of ["getPublicData", "getArticles"]) {
    const start = source.indexOf(`logDbFallback("${fn}"`);
    assert.ok(start > 0, `expected a fallback branch for ${fn}`);
    const branch = source.slice(start, start + 600);
    assert.match(branch, /snapshotArticlesWithoutBodies\(\)/, `${fn} fallback must strip bodies`);
    assert.doesNotMatch(
      branch,
      /articles: snapshotArticles\(\)|return snapshotArticles\(\);/,
      `${fn} fallback must not return raw snapshot articles`,
    );
  }
});

test("single-article lookups keep snapshot bodies so outage pages still render", async () => {
  const source = await readFile(new URL("../lib/public-data.ts", import.meta.url), "utf8");
  for (const fn of ["getArticleById", "getArticleBySlug"]) {
    const start = source.indexOf(`logDbFallback("${fn}"`);
    if (start < 0) continue;
    const branch = source.slice(start, start + 600);
    assert.doesNotMatch(
      branch,
      /snapshotArticlesWithoutBodies/,
      `${fn} must keep bodies or outage article pages render empty`,
    );
  }
});

test("the snapshot retains bodies for the single-article path", async () => {
  const snapshot = JSON.parse(
    await readFile(new URL("../content/snapshot/public-data.json", import.meta.url), "utf8"),
  );
  const articles = snapshot.articles ?? [];
  assert.ok(articles.length > 0, "snapshot must retain articles");
  assert.ok(
    articles.some((a: { body?: string | null }) => (a.body ?? "").length > 0),
    "snapshot must keep at least one body, otherwise outage article pages are blank",
  );
});
