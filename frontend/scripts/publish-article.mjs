#!/usr/bin/env node
// Inserts one article into the live `articles` table.
// Usage: DATABASE_URL=... node scripts/publish-article.mjs path/to/article.json
//
// article.json shape:
// {
//   "title": string,            // required
//   "category": string,         // required, e.g. "Market Analysis" | "Lifestyle"
//   "author": string,           // required
//   "date": "Mon DD, YYYY",     // required, display date e.g. "Jul 8, 2026"
//   "excerpt": string,
//   "body": string,
//   "read_time": string,        // default "5 min read"
//   "area_slug": string,        // see frontend/lib/franklin-areas.ts
//   "topic_slug": string,       // market-trends | schools | development | local-politics | events-lifestyle
//   "category_class": string,   // default "card-img-market"
//   "icon": string,             // default "$"
//   "image_url": string | null,
//   "featured": boolean         // default false
// }

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/publish-article.mjs path/to/article.json");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

const article = JSON.parse(readFileSync(filePath, "utf-8"));

for (const field of ["title", "category", "author", "date"]) {
  if (!article[field]) {
    console.error(`Missing required field: ${field}`);
    process.exit(1);
  }
}

const slug = generateSlug(article.title);
const parsedDate = new Date(article.date);
const isoPrefix = Number.isNaN(parsedDate.getTime())
  ? new Date().toISOString().slice(0, 10)
  : parsedDate.toISOString().slice(0, 10);
const id = `${isoPrefix}-${slug}`;

const sql = neon(databaseUrl);

const [row] = await sql`
  INSERT INTO articles (
    id, status, featured, category, category_class, icon,
    title, excerpt, body, author, date, read_time,
    area_slug, topic_slug, image_url
  ) VALUES (
    ${id}, 'live', ${article.featured ?? false},
    ${article.category}, ${article.category_class ?? "card-img-market"}, ${article.icon ?? "$"},
    ${article.title}, ${article.excerpt ?? null}, ${article.body ?? null}, ${article.author}, ${article.date},
    ${article.read_time ?? "5 min read"}, ${article.area_slug ?? null}, ${article.topic_slug ?? null},
    ${article.image_url ?? null}
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING *
`;

if (!row) {
  console.error(`Insert skipped: an article with id "${id}" already exists.`);
  process.exit(1);
}

console.log("Published:");
console.log(JSON.stringify(row, null, 2));
