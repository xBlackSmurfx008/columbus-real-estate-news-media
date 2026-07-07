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

const VALID_TOPICS = ["market-trends", "schools", "development", "local-politics", "events-lifestyle"];

const article = JSON.parse(readFileSync(filePath, "utf-8"));

for (const field of ["title", "category", "author", "date"]) {
  if (!article[field]) {
    console.error(`Missing required field: ${field}`);
    process.exit(1);
  }
}

if (article.topic_slug && !VALID_TOPICS.includes(article.topic_slug)) {
  console.error(`Invalid topic_slug "${article.topic_slug}". Must be one of: ${VALID_TOPICS.join(", ")}`);
  process.exit(1);
}

if (article.excerpt && (article.excerpt.length < 100 || article.excerpt.length > 180)) {
  console.warn(`Warning: excerpt is ${article.excerpt.length} chars; SEO convention is 150-160.`);
}

// Format using local date parts — toISOString() would shift the day in UTC+ timezones.
function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const slug = generateSlug(article.title);
const parsedDate = new Date(article.date);
const isoPrefix = toIsoDate(Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
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
  console.error(`Insert skipped: an article with id "${id}" already exists. Adjust the title (the id is derived from date + title) and retry.`);
  process.exit(1);
}

console.log("Published:");
console.log(JSON.stringify(row, null, 2));
