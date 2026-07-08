#!/usr/bin/env node
// Sets image_url on existing articles from a results file of "article_id|image_url" lines.
// Lines with "FAILED" as the URL are skipped.
// Usage: DATABASE_URL=... node scripts/set-article-images.mjs path/to/results.txt

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/set-article-images.mjs path/to/results.txt");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const lines = readFileSync(filePath, "utf-8").split("\n").filter((l) => l.includes("|"));

for (const line of lines) {
  const [id, url] = line.split("|").map((s) => s.trim());
  if (!id || !url || url === "FAILED" || !url.startsWith("https://")) {
    console.log(`skip: ${id || line}`);
    continue;
  }
  const [row] = await sql`
    UPDATE articles SET image_url = ${url}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, title
  `;
  console.log(row ? `updated: ${row.id} — ${row.title}` : `NOT FOUND: ${id}`);
}
