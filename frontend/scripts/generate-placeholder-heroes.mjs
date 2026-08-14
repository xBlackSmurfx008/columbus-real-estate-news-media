#!/usr/bin/env node
// Attaches a branded editorial-card hero to every live article missing one.
// Owner requirement (2026-08-14): no live article may be imageless; a failed
// or missing photo is fixed immediately. Cards are written to
// frontend/public/images/heroes/<id>.webp (deployed with the site) and marked
// as placeholders in image_caption so the local illustration job upgrades them.
// Usage: DATABASE_URL=... node scripts/generate-placeholder-heroes.mjs [--dry-run]

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { generateCardWebp } from "./editorial-card-lib.mjs";

export const PLACEHOLDER_CAPTION = "CREN editorial graphic (placeholder pending illustration)";
export const PLACEHOLDER_URL_PREFIX = "/images/heroes/";

const dryRun = process.argv.includes("--dry-run");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

function humanizeSlug(slug) {
  if (!slug || slug === "no-area") return "";
  return slug
    .split("-")
    .map((w) => (w === "s" ? "s" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

const missing = await sql`
  SELECT id, title, category, area_slug
  FROM articles
  WHERE status = 'live' AND image_url IS NULL
  ORDER BY created_at
`;

if (missing.length === 0) {
  console.log(JSON.stringify({ ok: true, generated: 0, message: "every live article has a hero" }));
  process.exit(0);
}

const outDir = resolve(process.cwd(), "public/images/heroes");
if (!dryRun) await mkdir(outDir, { recursive: true });

const results = [];
for (const article of missing) {
  const buffer = await generateCardWebp({
    title: article.title,
    category: article.category,
    areaLabel: humanizeSlug(article.area_slug),
  });
  const fileName = `${article.id}.webp`;
  const publicUrl = `${PLACEHOLDER_URL_PREFIX}${fileName}`;
  if (!dryRun) {
    await writeFile(resolve(outDir, fileName), buffer);
    await sql`
      UPDATE articles
      SET image_url = ${publicUrl},
          image_alt = ${`Editorial graphic: ${article.title}`},
          image_caption = ${PLACEHOLDER_CAPTION},
          updated_at = NOW()
      WHERE id = ${article.id} AND image_url IS NULL
    `;
  }
  results.push({ id: article.id, url: publicUrl, bytes: buffer.length });
}

console.log(JSON.stringify({ ok: true, generated: results.length, dryRun, articles: results }, null, 2));
