#!/usr/bin/env node
// Bulk-publish articles from a JSON array file, attaching hero images by index.
// Usage: DATABASE_URL=... node scripts/publish-batch.mjs articles.json [images.txt]
//   articles.json : array of article objects (same shape as publish-article.mjs)
//   images.txt    : optional lines "<index>|<url>" mapping array index -> image_url
// Idempotent: ON CONFLICT (id) DO NOTHING, so re-running skips existing.

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const [articlesPath, imagesPath] = process.argv.slice(2);
if (!articlesPath) {
  console.error("Usage: node scripts/publish-batch.mjs articles.json [images.txt]");
  process.exit(1);
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80);
}
function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const articles = JSON.parse(readFileSync(articlesPath, "utf-8"));
const images = {};
if (imagesPath) {
  for (const line of readFileSync(imagesPath, "utf-8").split("\n")) {
    const [i, url] = line.split("|");
    if (url && url.trim().startsWith("https://")) images[Number(i)] = url.trim();
  }
}

const VALID_TOPICS = ["market-trends", "schools", "development", "local-politics", "events-lifestyle"];
const sql = neon(databaseUrl);

let published = 0, skipped = 0, noImage = 0;
for (let i = 0; i < articles.length; i++) {
  const a = articles[i];
  if (!a.title || !a.category || !a.topic_slug) { console.log(`skip[${i}]: missing required field`); skipped++; continue; }
  if (!VALID_TOPICS.includes(a.topic_slug)) { console.log(`skip[${i}]: bad topic ${a.topic_slug}`); skipped++; continue; }

  const slug = generateSlug(a.title);
  const parsed = new Date(a.date);
  const isoPrefix = toIsoDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  const id = `${isoPrefix}-${slug}`;
  const imageUrl = images[i] ?? a.image_url ?? null;
  if (!imageUrl) noImage++;

  const [row] = await sql`
    INSERT INTO articles (id, status, featured, category, category_class, icon, title, excerpt, body, author, date, read_time, area_slug, topic_slug, image_url)
    VALUES (${id}, 'live', false, ${a.category}, ${a.category_class ?? "card-img-market"}, ${a.icon ?? "$"},
      ${a.title}, ${a.excerpt ?? null}, ${a.body ?? null}, ${a.author ?? "CRE Newsroom"}, ${a.date}, ${a.read_time ?? "5 min read"},
      ${a.area_slug ?? null}, ${a.topic_slug}, ${imageUrl})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  if (row) { console.log(`published[${i}]: ${id}${imageUrl ? "" : " (no image)"}`); published++; }
  else { console.log(`skip[${i}]: id exists ${id}`); skipped++; }
}

console.log(`\n${published} published, ${skipped} skipped, ${noImage} without image`);
