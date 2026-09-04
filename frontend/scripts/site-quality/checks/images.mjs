// Image integrity.
//
// scripts/article-image-policy.mjs already owns what a publishable hero IS
// (durable host, content fingerprint, near-duplicate distance) and
// scripts/public-image-audit.mjs already owns "does every live hero still
// resolve". Neither is wired to anything that runs before a deploy, so this
// module imports the first and invokes the second, and adds the two policy
// questions that had no owner:
//
//   - CLAUDE.md is explicit that a local /images/heroes/ path "is not a
//     publication image". Nothing enforced that after publish.
//   - a hero with no fingerprint row, or one sharing a fingerprint with
//     another article, means the same picture is doing duty for two stories.

import { isDurableArticleImageUrl } from "../../article-image-policy.mjs";
import { openDatabase, tableExists } from "../db.mjs";
import { tags } from "../html.mjs";
import { mapLimit } from "../http.mjs";
import { htmlPages } from "../pages.mjs";
import { fail, pass, skip, verdict } from "../result.mjs";
import { runNode, tail } from "../spawn.mjs";

export const imagePolicy = {
  id: "images-policy",
  title: "Hero image policy",
  blocking: true,
  async run() {
    const { sql, reason } = await openDatabase();
    if (!sql) return skip("images-policy", "Hero image policy", true, reason);

    const articles = await sql`
      SELECT id, title, canonical_slug, image_url, image_alt
      FROM articles
      WHERE status = 'live'
      ORDER BY created_at DESC
    `;

    const findings = [];
    const advisory = [];
    for (const article of articles) {
      const slug = article.canonical_slug || article.id;
      const url = article.image_url;
      if (!url) {
        findings.push(`/blog/${slug} — no hero image at all`);
        continue;
      }
      if (!isDurableArticleImageUrl(url)) {
        findings.push(`/blog/${slug} — hero "${url}" is not on a durable host (CLAUDE.md: local /images/heroes/ paths are not publication images)`);
      }
      if (!article.image_alt || !String(article.image_alt).trim()) {
        advisory.push(`/blog/${slug} — hero has no alt text`);
      }
    }

    // Fingerprint coverage and uniqueness.
    let fingerprintStats = null;
    if (await tableExists(sql, "article_image_fingerprints")) {
      const missing = await sql`
        SELECT articles.canonical_slug, articles.id
        FROM articles
        LEFT JOIN article_image_fingerprints ON article_image_fingerprints.article_id = articles.id
        WHERE articles.status = 'live'
          AND articles.image_url IS NOT NULL AND articles.image_url <> ''
          AND article_image_fingerprints.article_id IS NULL
      `;
      for (const row of missing) {
        findings.push(`/blog/${row.canonical_slug || row.id} — hero has no fingerprint row, so nothing can tell whether it duplicates another story's image`);
      }
      const duplicates = await sql`
        SELECT article_image_fingerprints.sha256, COUNT(*)::int AS n,
               ARRAY_AGG(article_image_fingerprints.article_id) AS article_ids
        FROM article_image_fingerprints
        JOIN articles ON articles.id = article_image_fingerprints.article_id
        WHERE article_image_fingerprints.sha256 IS NOT NULL AND articles.status = 'live'
        GROUP BY article_image_fingerprints.sha256
        HAVING COUNT(*) > 1
      `;
      for (const row of duplicates) {
        findings.push(`${row.n} live articles share one hero image (sha256 ${String(row.sha256).slice(0, 12)}…): ${row.article_ids.join(", ")}`);
      }
      fingerprintStats = { missing: missing.length, duplicateGroups: duplicates.length };
    } else {
      findings.push("article_image_fingerprints table is missing; hero uniqueness cannot be verified");
    }

    const stats = { liveArticles: articles.length, fingerprints: fingerprintStats };
    if (findings.length > 0) {
      return fail("images-policy", "Hero image policy", true, `${findings.length} hero image policy violation(s)`, [...findings, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("images-policy", "Hero image policy", false, `${advisory.length} hero image note(s)`, advisory, stats);
    }
    return pass("images-policy", "Hero image policy", true, `all ${articles.length} live hero(es) are durable, fingerprinted and unique`, stats);
  },
};

export function parseAuditReport(stdout) {
  const start = String(stdout).indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(String(stdout).slice(start));
  } catch {
    return null;
  }
}

export const imagesReachable = {
  id: "images-reachable",
  title: "Hero images still resolve",
  blocking: true,
  async run(context) {
    const { sql, reason } = await openDatabase();
    if (!sql) return skip("images-reachable", "Hero images still resolve", true, reason);

    // scripts/public-image-audit.mjs owns the careful HEAD-then-ranged-GET
    // double check that keeps a transient timeout from condemning a good photo.
    // Run it read-only (never --fix: this suite verifies, it does not repair).
    const run = await runNode(["scripts/public-image-audit.mjs"], {
      env: { ...process.env, CREN_PUBLIC_BASE_URL: context.target.origin },
      timeoutMs: context.options.imageTimeoutMs,
    });
    if (run.code === null) {
      return skip(
        "images-reachable",
        "Hero images still resolve",
        true,
        `public-image-audit did not finish within ${Math.round(context.options.imageTimeoutMs / 1000)}s (it checks every live hero over the network); raise --image-timeout-ms or run npm run newsroom:audit-public-images directly`,
      );
    }
    if (run.ok) {
      return pass("images-reachable", "Hero images still resolve", true, "public-image-audit reports every live hero resolves", {
        via: "scripts/public-image-audit.mjs",
      });
    }
    // public-image-audit prints a JSON report; render it as findings rather
    // than dumping raw lines, so the gate output stays readable.
    const report = parseAuditReport(run.stdout);
    const findings = report
      ? [
          ...(report.missing ?? []).map((entry) => `${entry.id} — "${entry.title}" has no hero image at all`),
          ...(report.broken ?? []).map((entry) => `${entry.id} — hero does not resolve: ${entry.image_url ?? entry.url ?? "unknown URL"}`),
        ]
      : tail(`${run.stdout}\n${run.stderr}`, 20);

    return fail(
      "images-reachable",
      "Hero images still resolve",
      true,
      `public-image-audit found ${findings.length} missing or broken hero image(s)`,
      findings,
      { via: "scripts/public-image-audit.mjs", exitCode: run.code },
    );
  },
};

export const renderedImages = {
  id: "images-rendered",
  title: "Images referenced by served pages resolve",
  blocking: false,
  async run(context) {
    const usable = htmlPages(context.pages);
    if (usable.size === 0) return skip("images-rendered", "Images referenced by served pages resolve", false, "no page on the target returned renderable HTML");

    const sources = new Map();
    for (const [path, response] of usable) {
      for (const entry of tags(response.text)) {
        if (entry.tag !== "img") continue;
        const src = entry.attributes.src;
        if (!src || src.startsWith("data:")) continue;
        let absolute;
        try {
          absolute = new URL(src, context.target.origin).toString();
        } catch {
          continue;
        }
        if (!sources.has(absolute)) sources.set(absolute, path);
      }
    }
    if (sources.size === 0) {
      return skip("images-rendered", "Images referenced by served pages resolve", false, "no <img> tags found in the sampled pages (Next.js may be serving them via CSS or srcset only)");
    }

    const results = await mapLimit([...sources.keys()], 6, async (src) => {
      const response = await context.http.head(src);
      return { src, status: response.status, contentType: response.headers.get("content-type") ?? "", error: response.error };
    });

    const findings = results
      .filter((entry) => entry.status === null || entry.status >= 400)
      .map((entry) => `${entry.src} — ${entry.status === null ? entry.error : `HTTP ${entry.status}`} (on ${sources.get(entry.src)})`);

    return verdict(
      "images-rendered",
      "Images referenced by served pages resolve",
      false,
      findings,
      `all ${sources.size} image(s) referenced by the sampled pages resolve`,
      `${findings.length} of ${sources.size} referenced image(s) do not resolve`,
      { imagesChecked: sources.size },
    );
  },
};
