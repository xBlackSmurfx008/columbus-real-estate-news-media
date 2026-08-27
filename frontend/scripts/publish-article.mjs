#!/usr/bin/env node
// Publishes one article live after deterministic editorial checks.
// Owner policy (2026-08-25, given live in-session; supersedes the 2026-08-21
// staging policy): publish live by default, no human pre-publish approval;
// review and fix happen post-publish. See CLAUDE.md "Publication policy".
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
//   "tags": string[],           // Columbus + topic + area + category context
//   "category_class": string,   // default "card-img-market"
//   "icon": string,             // default "$"
//   "image_url": string | null,
//   "featured": boolean         // default false
// }

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { evaluateArticle, formatQualityReport } from "./editorial-quality-lib.mjs";
import { ensureEditorialReviewTable, saveEditorialReview } from "./editorial-review-store.mjs";
import {
  ensureArticleImageFingerprintTable,
  findDuplicateImageFingerprint,
  fingerprintArticleImageUrl,
  isDurableArticleImageUrl,
} from './article-image-policy.mjs';
import { hostPlaceholderCard, PLACEHOLDER_CAPTION } from "./editorial-card-lib.mjs";
import { sendTelegramAlert } from "./telegram-alert.mjs";

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

if (article.image_url != null && !isDurableArticleImageUrl(article.image_url)) {
  console.error('Image URL must use an approved durable HTTPS image host. Use null to run the image backfill.');
  process.exit(1);
}

const qualityReport = evaluateArticle(article);
if (!qualityReport.passed) {
  console.error(`Editorial quality gate blocked this draft:\n${formatQualityReport(qualityReport)}`);
  process.exit(1);
}

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
await ensureEditorialReviewTable(sql);
await ensureArticleImageFingerprintTable(sql);

let imageFingerprint = null;
if (article.image_url) {
  imageFingerprint = await fingerprintArticleImageUrl(article.image_url);
  if (!imageFingerprint) {
    console.error('Image URL is not reachable as a decodable image.');
    process.exit(1);
  }
  const existingFingerprints = await sql`
    SELECT article_id, sha256, perceptual_hash FROM article_image_fingerprints
  `;
  const duplicateImage = findDuplicateImageFingerprint(existingFingerprints, imageFingerprint);
  if (duplicateImage) {
    console.error(`Image duplicates article "${duplicateImage.articleId}" (${duplicateImage.kind}, distance ${duplicateImage.distance}).`);
    process.exit(1);
  }
}

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
    id, canonical_slug, status, featured, category, category_class, icon,
    title, excerpt, body, author, date, read_time,
    area_slug, topic_slug, tags, image_url, meta_description, image_alt, image_caption, fact_checked_at
  ) VALUES (
    ${id}, ${slug}, 'live', ${article.featured ?? false},
    ${article.category}, ${article.category_class ?? "card-img-market"}, ${article.icon ?? "$"},
    ${article.title}, ${article.excerpt ?? null}, ${article.body ?? null}, ${article.author}, ${article.date},
    ${article.read_time ?? "5 min read"}, ${article.area_slug ?? null}, ${article.topic_slug ?? null},
    ${JSON.stringify(article.tags ?? [])}::jsonb,
    ${article.image_url ?? null}, ${article.meta_description}, ${article.image_alt},
    ${article.image_provenance.caption}, ${article.fact_checked_at}
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING *
`;

if (!row) {
  console.error(`Insert skipped: an article with id "${id}" already exists. Adjust the title (the id is derived from date + title) and retry.`);
  process.exit(1);
}

await saveEditorialReview(sql, id, article, qualityReport);
if (article.image_url && imageFingerprint) {
  await sql`
    INSERT INTO article_image_fingerprints (article_id, image_url, sha256, perceptual_hash, verified_at)
    VALUES (${id}, ${article.image_url}, ${imageFingerprint.sha256}, ${imageFingerprint.perceptualHash}, NOW())
    ON CONFLICT (article_id) DO UPDATE SET
      image_url = EXCLUDED.image_url,
      sha256 = EXCLUDED.sha256,
      perceptual_hash = EXCLUDED.perceptual_hash,
      verified_at = NOW()
  `;
}

// Hero requirement (owner, 2026-08-14): no live article ships imageless. If no
// image_url was supplied, attach a branded editorial card immediately as a
// placeholder; the image workflow replaces it with a real illustration.
if (!row.image_url) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const hosted = await hostPlaceholderCard({ id, title: article.title, category: article.category, area_slug: article.area_slug });
    await sql`
      UPDATE articles
      SET image_url = ${hosted.url},
          image_alt = ${`Editorial graphic: ${article.title}`},
          image_caption = ${PLACEHOLDER_CAPTION},
          updated_at = NOW()
      WHERE id = ${id} AND image_url IS NULL
    `;
    row.image_url = hosted.url;
    console.log(`Hero placeholder attached: ${hosted.url}`);
  } else {
    console.warn(
      "WARNING: article published without a hero and BLOB_READ_WRITE_TOKEN is not set, so no hero can be attached from this session. "
      + "Do NOT work around this with --allow-deploy-lag: it writes a /images/heroes/ path that 404s until the next deploy, and a broken hero is worse than none. "
      + "Set BLOB_READ_WRITE_TOKEN in this environment and re-run scripts/generate-placeholder-heroes.mjs, or leave the article imageless for the durable image job to fill."
    );
  }
}

// Owner notification per publish (CMO directive 2026-08-17 P2). Best-effort:
// a Telegram outage must never roll back or block a publish.
const telegram = await sendTelegramAlert({
  status: "COMPLETED",
  summary: `Published live: ${article.title} (${article.category}, quality ${qualityReport.score}/${qualityReport.possible})`,
  articles: [{ id, title: article.title }],
  linkMode: "live",
});
if (!telegram.ok) console.warn(`Telegram publish alert not delivered: ${telegram.error}`);

console.log("Published live (post-publish review policy):");
console.log(JSON.stringify({
  article: row,
  quality: { score: qualityReport.score, possible: qualityReport.possible },
  review_url: `https://columbusrealestatenews.com/admin/articles?edit=${encodeURIComponent(id)}`,
}, null, 2));
