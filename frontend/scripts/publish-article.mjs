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

// --- Duplicate guard -------------------------------------------------------
// Hard backstop so the same story can never be published twice, even with a
// different date or slightly reworded title (the id-collision check only stops
// byte-identical ids). Compares significant title tokens against every existing
// article. Blocks on a high-overlap match; warns on a moderate one.
// Override a genuine false positive with `--force`.
const FORCE = process.argv.includes("--force") || process.env.FORCE === "1";
// Light stop-list: TRUE function words only. Keep domain nouns (columbus, home,
// prices, market, dublin, ...) — they are exactly what makes two headlines the
// same story. Calibrated against the live corpus: distinct same-beat stories
// top out ~27% overlap, a reworded duplicate scores ~67%, so 0.4 separates them.
const STOP_WORDS = new Set(
  "the a an of in on to as at is are was were and or for with from that this its it by into over after amid but if then than so".split(/\s+/)
);
function sigTokens(t) {
  return new Set(
    String(t).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}
const newTokens = sigTokens(article.title);
if (newTokens.size > 0) {
  const existing = await sql`SELECT id, title FROM articles`;
  let worst = { jac: 0, shared: [], id: null, title: null };
  for (const e of existing) {
    if (e.id === id) continue; // exact-id collision handled by ON CONFLICT below
    const et = sigTokens(e.title);
    const shared = [...newTokens].filter((w) => et.has(w));
    const union = new Set([...newTokens, ...et]);
    const jac = union.size ? shared.length / union.size : 0;
    if (jac > worst.jac) worst = { jac, shared, id: e.id, title: e.title };
  }
  const isDuplicate = worst.jac >= 0.4;
  if (isDuplicate && !FORCE) {
    console.error(
      `Duplicate guard blocked this article.\n`
      + `  New:      "${article.title}"\n`
      + `  Existing: "${worst.title}" (id: ${worst.id})\n`
      + `  Overlap:  ${(worst.jac * 100).toFixed(0)}% of title terms; shared: ${worst.shared.join(", ")}\n`
      + `This looks like a story we already covered. Pick a genuinely new story, or\n`
      + `if this really is different, re-run with --force.`
    );
    process.exit(1);
  }
  if (worst.jac >= 0.3) {
    console.warn(
      `Warning: title overlaps ${(worst.jac * 100).toFixed(0)}% with existing "${worst.title}" (${worst.shared.join(", ")}). Publishing anyway — confirm it is a distinct story.`
    );
  }
}
// ---------------------------------------------------------------------------

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
