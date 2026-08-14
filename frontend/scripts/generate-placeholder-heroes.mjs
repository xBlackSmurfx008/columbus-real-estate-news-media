#!/usr/bin/env node
// Attaches a branded editorial-card hero to every live article missing one.
// Owner requirement (2026-08-14): no live article may be imageless; a failed
// or missing photo is fixed immediately. With BLOB_READ_WRITE_TOKEN set the
// card is uploaded to Vercel Blob and is live instantly; otherwise it is
// written to frontend/public/images/heroes/ and ONLY serves after the next
// deploy — in that mode, do not update the DB until the deploy is confirmed
// (use --allow-deploy-lag to update anyway).
// The image_caption marks the hero as a placeholder so the local illustration
// job upgrades it. Usage:
//   DATABASE_URL=... node scripts/generate-placeholder-heroes.mjs [--dry-run] [--allow-deploy-lag]

import { neon } from "@neondatabase/serverless";
import { hostPlaceholderCard, PLACEHOLDER_CAPTION } from "./editorial-card-lib.mjs";

const dryRun = process.argv.includes("--dry-run");
const allowDeployLag = process.argv.includes("--allow-deploy-lag");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

const missing = await sql`
  SELECT id, title, category, area_slug
  FROM articles
  WHERE status = 'live' AND image_url IS NULL
  ORDER BY created_at
`;

if (missing.length === 0) {
  console.log(JSON.stringify({ ok: true, generated: 0, message: "every live article has a hero" }));
  process.exit(0);
}

if (!process.env.BLOB_READ_WRITE_TOKEN && !allowDeployLag && !dryRun) {
  console.error(JSON.stringify({
    ok: false,
    error: "NO_BLOB_TOKEN",
    message:
      "BLOB_READ_WRITE_TOKEN is not set, so cards would point at /images/heroes/ paths that 404 until the next deploy (broken heroes are worse than none). Set the token, or run with --allow-deploy-lag right before a deploy.",
    missing: missing.length,
  }, null, 2));
  process.exit(1);
}

const results = [];
for (const article of missing) {
  if (dryRun) {
    results.push({ id: article.id, dryRun: true });
    continue;
  }
  const hosted = await hostPlaceholderCard(article);
  await sql`
    UPDATE articles
    SET image_url = ${hosted.url},
        image_alt = ${`Editorial graphic: ${article.title}`},
        image_caption = ${PLACEHOLDER_CAPTION},
        updated_at = NOW()
    WHERE id = ${article.id} AND image_url IS NULL
  `;
  results.push({ id: article.id, url: hosted.url, deployNeeded: hosted.deployNeeded, bytes: hosted.bytes });
}

const deployNeeded = results.some((r) => r.deployNeeded);
console.log(JSON.stringify({
  ok: true,
  generated: results.length,
  dryRun,
  deployNeeded,
  ...(deployNeeded ? { warning: "cards serve only after the next deploy — commit frontend/public/images/heroes/ and deploy now" } : {}),
  articles: results,
}, null, 2));
