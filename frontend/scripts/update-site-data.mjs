#!/usr/bin/env node
// Replaces homepage data tables from a JSON file. Only keys present in the file are touched.
// Usage: DATABASE_URL=... node scripts/update-site-data.mjs path/to/data.json
//
// data.json shape (all keys optional):
// {
//   "ticker": ["headline one", "headline two", ...],                  // replaces all ticker items
//   "market_snapshot": [{"label","value","change","direction"}, ...], // replaces all snapshot cards
//   "hero_stats": [{"value","label"}, ...]                            // replaces all hero stats
//   "neighborhoods": [{"name","median","yoy","rent","dom","inventory"}, ...] // UPDATES by name; fields set to "UNVERIFIED" or omitted are left unchanged
// }

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

if (Array.isArray(data.neighborhoods) && data.neighborhoods.length > 0) {
  const FIELDS = ["median", "yoy", "rent", "dom", "inventory"];
  let updated = 0, missing = 0;
  for (const n of data.neighborhoods) {
    if (!n.name) continue;
    // Only touch fields that are present and not the sentinel "UNVERIFIED".
    const sets = FIELDS.filter((f) => n[f] && n[f] !== "UNVERIFIED");
    if (sets.length === 0) continue;
    const rows = await sql`SELECT id FROM neighborhoods WHERE name = ${n.name}`;
    if (rows.length === 0) { console.log(`  neighborhood not found (skipped): ${n.name}`); missing++; continue; }
    // Build the update per field (neon tagged-template can't take dynamic column lists cleanly).
    for (const f of sets) {
      if (f === "median") await sql`UPDATE neighborhoods SET median = ${n.median} WHERE name = ${n.name}`;
      else if (f === "yoy") await sql`UPDATE neighborhoods SET yoy = ${n.yoy} WHERE name = ${n.name}`;
      else if (f === "rent") await sql`UPDATE neighborhoods SET rent = ${n.rent} WHERE name = ${n.name}`;
      else if (f === "dom") await sql`UPDATE neighborhoods SET dom = ${n.dom} WHERE name = ${n.name}`;
      else if (f === "inventory") await sql`UPDATE neighborhoods SET inventory = ${n.inventory} WHERE name = ${n.name}`;
    }
    updated++;
  }
  console.log(`neighborhoods: updated ${updated}, ${missing} name(s) not found`);
}

// Any write that touches market numbers must leave the committed outage
// fallback in step with the database — otherwise /market-data and the homepage
// can serve different values again.
if (data.market_snapshot || data.neighborhoods || data.hero_stats) {
  const script = join(dirname(fileURLToPath(import.meta.url)), "export-content-snapshot.mjs");
  console.log("re-exporting content/snapshot/public-data.json ...");
  const result = spawnSync(process.execPath, [script], { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    console.error("snapshot re-export FAILED — the outage fallback is now behind the database.");
    process.exit(result.status ?? 1);
  }
}

console.log("done");
