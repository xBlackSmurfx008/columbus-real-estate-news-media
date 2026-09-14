#!/usr/bin/env node
// Lists already-published articles so the daily pipeline can avoid duplicate topics.
// Default is ALL-TIME (the full backlog) so nothing already covered is ever invisible
// to the dedupe step. Pass a number to limit to the last N days instead.
// Usage: DATABASE_URL=... node scripts/recent-articles.mjs [days]
//
// Without DATABASE_URL it falls back to the committed content snapshot
// (content/snapshot/public-data.json) instead of failing, so a
// credential-less AM session still sees the full live backlog for dedupe.
// The snapshot refreshes on every publish and market refresh, so it can only
// lag by articles published since the last credentialed session — treat it as
// the minimum set of covered stories, never proof a story is uncovered.

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const days = process.argv[2] ? Number(process.argv[2]) : null;

const databaseUrl = process.env.DATABASE_URL;
let rows;
let fallback = false;

if (databaseUrl) {
  const sql = neon(databaseUrl);
  rows = days
    ? await sql`
        SELECT id, title, date, topic_slug, area_slug, created_at
        FROM articles
        WHERE created_at >= NOW() - (${days} || ' days')::interval
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT id, title, date, topic_slug, area_slug, created_at
        FROM articles
        ORDER BY created_at DESC
      `;
} else {
  const here = dirname(fileURLToPath(import.meta.url));
  const snapshotPath = join(here, "..", "content", "snapshot", "public-data.json");
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  } catch (error) {
    console.error(
      "DATABASE_URL is not set and the committed snapshot could not be read " +
        `(${error instanceof Error ? error.message : String(error)}). ` +
        "No dedupe list is available — do NOT publish or draft-as-new without one."
    );
    process.exit(1);
  }
  fallback = true;
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
  rows = (snapshot.articles ?? [])
    .map((a) => ({
      id: a.id,
      title: a.title,
      date: a.date,
      topic_slug: a.topic_slug,
      area_slug: a.area_slug,
      created_at: a.created_at,
    }))
    .filter((a) => !cutoff || (a.created_at && Date.parse(a.created_at) >= cutoff))
    .sort((a, b) => Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0));
  console.log(
    "NOTE: DATABASE_URL is not set — this list comes from the committed snapshot " +
      `(generated ${snapshot._meta?.generated_at ?? "unknown"}), not the live database. ` +
      "It may lag by anything published since that export. Treat it as the MINIMUM " +
      "covered set: a story on this list is definitely covered; a story missing from " +
      "it still needs a live-database check before publish.\n"
  );
}

const scope = days ? `in the last ${days} days` : "ever published (all-time)";
if (rows.length === 0) {
  console.log(`No articles found ${scope}${fallback ? " (snapshot fallback)" : ""}.`);
} else {
  console.log(
    `${rows.length} article(s) ${scope}${fallback ? " (snapshot fallback)" : ""} — do NOT duplicate any of these stories:\n`
  );
  for (const r of rows) {
    console.log(`- [${r.date}] (${r.topic_slug ?? "no-topic"} / ${r.area_slug ?? "no-area"}) ${r.title}  {id: ${r.id}}`);
  }
}
