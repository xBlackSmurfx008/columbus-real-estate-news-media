#!/usr/bin/env node
// Replaces homepage data tables from a JSON file. Only keys present in the file are touched.
// Usage: DATABASE_URL=... node scripts/update-site-data.mjs path/to/data.json
//
// data.json shape (all keys optional):
// {
//   "ticker": ["headline one", "headline two", ...],                  // replaces all ticker items
//   "market_snapshot": [{"label","value","change","direction"}, ...], // replaces all snapshot cards
//   "hero_stats": [{"value","label"}, ...]                            // replaces all hero stats
// }

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/update-site-data.mjs path/to/data.json");
  process.exit(1);
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const data = JSON.parse(readFileSync(filePath, "utf-8"));
const sql = neon(databaseUrl);

if (Array.isArray(data.ticker) && data.ticker.length > 0) {
  await sql`DELETE FROM ticker_items`;
  let i = 0;
  for (const text of data.ticker) {
    await sql`INSERT INTO ticker_items (text, active, sort_order) VALUES (${text}, true, ${i++})`;
  }
  console.log(`ticker: replaced with ${data.ticker.length} items`);
}

if (Array.isArray(data.market_snapshot) && data.market_snapshot.length > 0) {
  await sql`DELETE FROM market_snapshot`;
  let i = 0;
  for (const s of data.market_snapshot) {
    await sql`INSERT INTO market_snapshot (label, value, change, direction, sort_order)
      VALUES (${s.label}, ${s.value}, ${s.change}, ${s.direction ?? "up"}, ${i++})`;
  }
  console.log(`market_snapshot: replaced with ${data.market_snapshot.length} cards`);
}

if (Array.isArray(data.hero_stats) && data.hero_stats.length > 0) {
  await sql`DELETE FROM hero_stats`;
  let i = 0;
  for (const h of data.hero_stats) {
    await sql`INSERT INTO hero_stats (value, label, sort_order) VALUES (${h.value}, ${h.label}, ${i++})`;
  }
  console.log(`hero_stats: replaced with ${data.hero_stats.length} stats`);
}

console.log("done");
