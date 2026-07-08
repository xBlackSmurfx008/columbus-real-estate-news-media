#!/usr/bin/env node
// Read-only report of all publicly displayed site data, for accuracy review.
// Usage: DATABASE_URL=... node scripts/site-data-report.mjs

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

const articles = await sql`SELECT id, status, featured, category, date, title, image_url IS NOT NULL AS has_image, area_slug, topic_slug FROM articles ORDER BY created_at DESC`;
console.log(`=== ARTICLES (${articles.length}) ===`);
for (const a of articles) {
  console.log(`- [${a.status}${a.featured ? ", FEATURED" : ""}] ${a.date} | ${a.category} | image:${a.has_image ? "yes" : "NO"} | ${a.title} (${a.id})`);
}

const snapshot = await sql`SELECT label, value, change, direction FROM market_snapshot ORDER BY sort_order`;
console.log(`\n=== MARKET SNAPSHOT (${snapshot.length}) ===`);
for (const s of snapshot) console.log(`- ${s.label}: ${s.value} (${s.change}, ${s.direction})`);

const hero = await sql`SELECT value, label FROM hero_stats ORDER BY sort_order`;
console.log(`\n=== HERO STATS (${hero.length}) ===`);
for (const h of hero) console.log(`- ${h.value} — ${h.label}`);

const ticker = await sql`SELECT text, active FROM ticker_items ORDER BY sort_order`;
console.log(`\n=== TICKER (${ticker.length}) ===`);
for (const t of ticker) console.log(`- [${t.active ? "on" : "off"}] ${t.text}`);

const hoods = await sql`SELECT name, median, yoy, rent, dom, inventory FROM neighborhoods ORDER BY sort_order`;
console.log(`\n=== NEIGHBORHOODS (${hoods.length}) ===`);
for (const n of hoods) console.log(`- ${n.name}: median ${n.median}, YoY ${n.yoy}, rent ${n.rent}, DOM ${n.dom}, inventory ${n.inventory}`);
