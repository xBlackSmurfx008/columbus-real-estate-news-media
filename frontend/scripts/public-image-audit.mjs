#!/usr/bin/env node
// Audits hero images on ALL live articles. Two failure classes:
//   missing — image_url is NULL (should be impossible since publish-time cards)
//   broken  — image_url is set but does not resolve to an image over HTTP
// Owner requirement (2026-08-14): a failed photo is fixed immediately. Run with
// --fix to attach a branded editorial-card placeholder to every missing/broken
// hero on the spot (cards land in frontend/public/images/heroes/ — commit them).
// Exit code 1 whenever any article is missing or broken (before --fix repair).
// Usage: DATABASE_URL=... node scripts/public-image-audit.mjs [--fix]

import { neon } from "@neondatabase/serverless";
import { hostPlaceholderCard, PLACEHOLDER_CAPTION } from "./editorial-card-lib.mjs";

try { process.loadEnvFile?.(".env.local"); } catch { /* fine: env may come from the session */ }

const PUBLIC_BASE_URL = process.env.CREN_PUBLIC_BASE_URL ?? "https://columbusrealestatenews.com";
const fix = process.argv.includes("--fix");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

// A false "broken" verdict is dangerous (--fix would replace a good photo with
// a placeholder), so a URL is only broken after BOTH strategies fail on BOTH
// attempts: HEAD, then a ranged GET, retried once after a pause. Timeouts and
// transient network errors on a single try never condemn an image.
async function imageResolves(url) {
  const absolute = url.startsWith("/") ? `${PUBLIC_BASE_URL}${url}` : url;
  const isImage = (r) => r.ok && (r.headers.get("content-type") ?? "").startsWith("image/");
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2_000));
    try {
      const head = await fetch(absolute, { method: "HEAD", signal: AbortSignal.timeout(20_000), redirect: "follow" });
      if (isImage(head)) return true;
      // Hard 404/410 on HEAD is definitive enough to skip the GET this attempt.
      if (head.status === 404 || head.status === 410) continue;
    } catch { /* fall through to GET */ }
    try {
      const get = await fetch(absolute, { headers: { range: "bytes=0-64" }, signal: AbortSignal.timeout(20_000), redirect: "follow" });
      if (isImage(get)) return true;
    } catch { /* retry loop */ }
  }
  return false;
}

const articles = await sql`
  SELECT id, title, category, area_slug, image_url
  FROM articles
  WHERE status = 'live'
  ORDER BY created_at DESC
`;

const missing = articles.filter((a) => !a.image_url);
const withUrl = articles.filter((a) => a.image_url);

const broken = [];
const CONCURRENCY = 8;
for (let i = 0; i < withUrl.length; i += CONCURRENCY) {
  const batch = withUrl.slice(i, i + CONCURRENCY);
  const checks = await Promise.all(batch.map((a) => imageResolves(a.image_url)));
  checks.forEach((ok, idx) => { if (!ok) broken.push(batch[idx]); });
}

const failures = [...missing, ...broken];
const repaired = [];

if (fix && failures.length > 0) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "--fix requires BLOB_READ_WRITE_TOKEN so repairs are live instantly. Without it, cards would point at "
      + "/images/heroes/ paths that 404 until the next deploy (a broken hero is worse than none). "
      + "For the deploy-coupled path use scripts/generate-placeholder-heroes.mjs --allow-deploy-lag right before deploying."
    );
    process.exit(1);
  }
  for (const article of failures) {
    const hosted = await hostPlaceholderCard(article);
    await sql`
      UPDATE articles
      SET image_url = ${hosted.url},
          image_alt = ${`Editorial graphic: ${article.title}`},
          image_caption = ${PLACEHOLDER_CAPTION},
          updated_at = NOW()
      WHERE id = ${article.id}
    `;
    repaired.push({ id: article.id, was: article.image_url, now: hosted.url });
  }
}

const result = {
  ok: failures.length === 0,
  liveArticles: articles.length,
  missing: missing.map((a) => ({ id: a.id, title: a.title })),
  broken: broken.map((a) => ({ id: a.id, title: a.title, image_url: a.image_url })),
  ...(fix ? { repaired } : {}),
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length > 0 && !fix) process.exitCode = 1;
