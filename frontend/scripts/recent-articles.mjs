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
//
// In both modes the list is unioned with the article packages committed under
// content/articles/, so a story the cloud routine handed off but the importer
// has not yet published is still visible to the dedupe step.

import { neon } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const days = process.argv[2] ? Number(process.argv[2]) : null;
const here = dirname(fileURLToPath(import.meta.url));

const normalizeTitle = (title) => String(title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function loadCommittedArticles(dir) {
  const rows = [];
  const unreadable = [];
  let names = [];
  try {
    names = readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  } catch {
    return { rows, unreadable };
  }
  for (const name of names) {
    const path = join(dir, name);
    let article;
    try {
      article = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      unreadable.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const id = basename(name, ".json");
    const date = article.date ?? id.slice(0, 10);
    const createdAt = article.fact_checked_at ?? (Number.isNaN(Date.parse(date)) ? `${id.slice(0, 10)}T00:00:00Z` : new Date(date).toISOString());
    rows.push({
      id,
      title: article.title,
      date,
      topic_slug: article.topic_slug ?? null,
      area_slug: article.area_slug ?? null,
      created_at: createdAt,
      canonical_event_key: article.canonical_event_key ?? null,
      committed_only: true,
    });
  }
  return { rows, unreadable };
}

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

const committed = loadCommittedArticles(join(here, "..", "content", "articles"));
const knownIds = new Set(rows.map((r) => r.id));
const knownTitles = new Set(rows.map((r) => normalizeTitle(r.title)));
const cutoffMs = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
let committedAdded = 0;
for (const article of committed.rows) {
  if (knownIds.has(article.id) || knownTitles.has(normalizeTitle(article.title))) continue;
  if (cutoffMs && Date.parse(article.created_at) < cutoffMs) continue;
  rows.push(article);
  committedAdded += 1;
}
if (committedAdded > 0) {
  rows.sort((a, b) => Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0));
  console.log(
    `NOTE: ${committedAdded} article package(s) committed under content/articles are not in the ` +
      `${fallback ? "snapshot" : "database"} and are listed below as [GitHub only]. They are handed off, ` +
      "not necessarily imported or published; they still count as covered for dedupe.\n"
  );
}
for (const problem of committed.unreadable) {
  console.error(`WARNING: content/articles/${problem} — unreadable package skipped; it needs repair through the correction path.`);
}

const scope = days ? `in the last ${days} days` : "ever published (all-time)";
if (rows.length === 0) {
  console.log(`No articles found ${scope}${fallback ? " (snapshot fallback)" : ""}.`);
} else {
  console.log(
    `${rows.length} article(s) ${scope}${fallback ? " (snapshot fallback)" : ""} — do NOT duplicate any of these stories:\n`
  );
  for (const r of rows) {
    const tags = [r.committed_only ? "GitHub only" : null, r.canonical_event_key ? `event: ${r.canonical_event_key}` : null]
      .filter(Boolean)
      .join("; ");
    console.log(
      `- [${r.date}] (${r.topic_slug ?? "no-topic"} / ${r.area_slug ?? "no-area"}) ${r.title}  {id: ${r.id}}${tags ? `  [${tags}]` : ""}`
    );
  }
}
