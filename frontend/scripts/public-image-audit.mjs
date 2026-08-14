#!/usr/bin/env node
// Audits hero images on ALL live articles. Two failure classes:
//   missing — image_url is NULL (should be impossible since publish-time cards)
//   broken  — image_url is set but does not resolve to an image over HTTP
// Owner requirement (2026-08-14): a failed photo is fixed immediately. Run with
// --fix to attach a branded editorial-card placeholder to every missing/broken
// hero on the spot (cards land in frontend/public/images/heroes/ — commit them).
// Exit code 1 whenever any article is missing or broken (before --fix repair).
// Usage: DATABASE_URL=... node scripts/public-image-audit.mjs [--fix]

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { generateCardWebp } from "./editorial-card-lib.mjs";

process.loadEnvFile?.(".env.local");

const PUBLIC_BASE_URL = process.env.CREN_PUBLIC_BASE_URL ?? "https://columbusrealestatenews.com";
const PLACEHOLDER_CAPTION = "CREN editorial graphic (placeholder pending illustration)";
const fix = process.argv.includes("--fix");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

async function imageResolves(url) {
  const absolute = url.startsWith("/") ? `${PUBLIC_BASE_URL}${url}` : url;
  try {
    const response = await fetch(absolute, { method: "HEAD", signal: AbortSignal.timeout(10_000), redirect: "follow" });
    if (response.ok && (response.headers.get("content-type") ?? "").startsWith("image/")) return true;
    // Some hosts reject HEAD; retry with a ranged GET before calling it broken.
    if (response.status === 405 || response.status === 403) {
      const get = await fetch(absolute, { headers: { range: "bytes=0-64" }, signal: AbortSignal.timeout(10_000), redirect: "follow" });
      return get.ok && (get.headers.get("content-type") ?? "").startsWith("image/");
    }
    return false;
  } catch {
    return false;
  }
}

function humanizeSlug(slug) {
  if (!slug || slug === "no-area") return "";
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
  const outDir = resolve(process.cwd(), "public/images/heroes");
  await mkdir(outDir, { recursive: true });
  for (const article of failures) {
    const buffer = await generateCardWebp({
      title: article.title,
      category: article.category,
      areaLabel: humanizeSlug(article.area_slug),
    });
    await writeFile(resolve(outDir, `${article.id}.webp`), buffer);
    const placeholderUrl = `/images/heroes/${article.id}.webp`;
    await sql`
      UPDATE articles
      SET image_url = ${placeholderUrl},
          image_alt = ${`Editorial graphic: ${article.title}`},
          image_caption = ${PLACEHOLDER_CAPTION},
          updated_at = NOW()
      WHERE id = ${article.id}
    `;
    repaired.push({ id: article.id, was: article.image_url, now: placeholderUrl });
  }
}

const result = {
  ok: failures.length === 0,
  liveArticles: articles.length,
  missing: missing.map((a) => ({ id: a.id, title: a.title })),
  broken: broken.map((a) => ({ id: a.id, title: a.title, image_url: a.image_url })),
  ...(fix ? { repaired, commitReminder: repaired.length > 0 ? "commit frontend/public/images/heroes/ so repairs deploy" : undefined } : {}),
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length > 0 && !fix) process.exitCode = 1;
