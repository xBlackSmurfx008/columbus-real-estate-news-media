#!/usr/bin/env node
// Publishes one article live immediately after it passes the deterministic
// editorial checks (owner policy, 2026-08-25): no pre-publish human approval
// gate. Review and corrections happen post-publish via the admin panel.
// A missing hero image never blocks publication — the durable image workflow
// attaches or replaces the hero after the fact.
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
//   "featured": boolean,        // default false
//   "coverage_calendar_id": string  // optional; the calendar entry this covers
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
import { APPROVED_AUTHORS, canonicalizeAuthor, isApprovedAuthor } from "./newsroom-authors.mjs";
import { sendTelegramAlert } from "./telegram-alert.mjs";
import { PUBLICATION_GATES, recordGateBlock } from "./publication-gate-log.mjs";

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

// The client is constructed here (not after the gates) purely so a blocked
// attempt can be recorded. neon() opens no connection until a query runs.
const sql = neon(databaseUrl);

/**
 * Block publication and leave a durable trace (owner plan item 11: "failed
 * publication gates" is a weekly scorecard signal). The gate decision is
 * unchanged — this only makes the block countable a week later.
 */
async function blockPublication(gate, message, detail = {}) {
  console.error(message);
  await recordGateBlock(sql, {
    gate,
    // `detail.reason` lets a gate whose first console line is generic record
    // something a weekly reader can act on without opening the JSON detail.
    reason: (detail.reason ?? message.split("\n")[0]).slice(0, 1000),
    articleRef: detail.articleRef ?? null,
    articleTitle: detail.articleTitle ?? null,
    detail: detail.extra ?? {},
  });
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

const gateContext = () => ({ articleTitle: article.title ?? null });

if (article.image_url != null && !isDurableArticleImageUrl(article.image_url)) {
  await blockPublication(
    PUBLICATION_GATES.IMAGE_HOST,
    'Image URL must use an approved durable HTTPS image host. Use null to run the image backfill.',
    gateContext(),
  );
}

const qualityReport = evaluateArticle(article);
if (!qualityReport.passed) {
  await blockPublication(
    PUBLICATION_GATES.EDITORIAL_QUALITY,
    `Editorial quality gate blocked this draft:\n${formatQualityReport(qualityReport)}`,
    {
      ...gateContext(),
      reason: `Editorial quality gate: ${qualityReport.score}/${qualityReport.possible} checks passed; failed `
        + `${(qualityReport.failedCodes ?? []).join(", ")}`,
      extra: {
        score: qualityReport.score,
        possible: qualityReport.possible,
        failed_checks: qualityReport.failedCodes ?? [],
      },
    },
  );
}

for (const field of ["title", "category", "author", "date"]) {
  if (!article[field]) {
    await blockPublication(
      PUBLICATION_GATES.REQUIRED_FIELD,
      `Missing required field: ${field}`,
      { ...gateContext(), extra: { field } },
    );
  }
}

// One newsroom identity (owner plan 2026-09-04, P1 item 7). The approved byline
// list lives in scripts/newsroom-authors.mjs; extend it there when a real
// bylined human joins. A known legacy variant is corrected in place so the
// story still publishes; anything else is blocked.
{
  const canonical = canonicalizeAuthor(article.author);
  if (canonical !== article.author) {
    console.warn(`Byline "${article.author}" normalized to "${canonical}".`);
    article.author = canonical;
  }
  if (!isApprovedAuthor(article.author)) {
    await blockPublication(
      PUBLICATION_GATES.BYLINE,
      `Byline "${article.author}" is not an approved author.\n`
      + `Approved bylines: ${APPROVED_AUTHORS.join(", ")}.\n`
      + `Add a new byline to frontend/scripts/newsroom-authors.mjs before publishing under it.`,
      { ...gateContext(), extra: { byline: article.author } },
    );
  }
}

if (article.topic_slug && !VALID_TOPICS.includes(article.topic_slug)) {
  await blockPublication(
    PUBLICATION_GATES.TOPIC_SLUG,
    `Invalid topic_slug "${article.topic_slug}". Must be one of: ${VALID_TOPICS.join(", ")}`,
    { ...gateContext(), extra: { topic_slug: article.topic_slug } },
  );
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

await ensureEditorialReviewTable(sql);
await ensureArticleImageFingerprintTable(sql);

let imageFingerprint = null;
if (article.image_url) {
  imageFingerprint = await fingerprintArticleImageUrl(article.image_url);
  if (!imageFingerprint) {
    await blockPublication(
      PUBLICATION_GATES.IMAGE_UNREACHABLE,
      'Image URL is not reachable as a decodable image.',
      { ...gateContext(), articleRef: id },
    );
  }
  const existingFingerprints = await sql`
    SELECT article_id, sha256, perceptual_hash FROM article_image_fingerprints
  `;
  const duplicateImage = findDuplicateImageFingerprint(existingFingerprints, imageFingerprint);
  if (duplicateImage) {
    await blockPublication(
      PUBLICATION_GATES.IMAGE_DUPLICATE,
      `Image duplicates article "${duplicateImage.articleId}" (${duplicateImage.kind}, distance ${duplicateImage.distance}).`,
      { ...gateContext(), articleRef: id, extra: { duplicate_of: duplicateImage.articleId, kind: duplicateImage.kind } },
    );
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
    await blockPublication(
      PUBLICATION_GATES.DUPLICATE_STORY,
      `Duplicate guard blocked this article.\n`
      + `  New:      "${article.title}"\n`
      + `  Existing: "${worst.title}" (id: ${worst.id})\n`
      + `  Overlap:  ${(worst.jac * 100).toFixed(0)}% of title terms; shared: ${worst.shared.join(", ")}\n`
      + `This looks like a story we already covered. Pick a genuinely new story, or\n`
      + `if this really is different, re-run with --force.`,
      { ...gateContext(), articleRef: id, extra: { duplicate_of: worst.id, overlap: Number(worst.jac.toFixed(3)) } },
    );
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
  await blockPublication(
    PUBLICATION_GATES.ID_COLLISION,
    `Insert skipped: an article with id "${id}" already exists. Adjust the title (the id is derived from date + title) and retry.`,
    { ...gateContext(), articleRef: id },
  );
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

// If no image_url was supplied, attach a branded editorial card so the live
// article isn't imageless; the durable image job replaces it with a real
// hero later. A missing hero never blocks publication either way.
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
      "WARNING: article published live without a hero and BLOB_READ_WRITE_TOKEN is not set, so no placeholder can be attached from this session. "
      + "Do NOT work around this with --allow-deploy-lag; it can write a hero URL that is not reachable until a deploy happens. "
      + "Set BLOB_READ_WRITE_TOKEN in this environment and re-run scripts/generate-placeholder-heroes.mjs, or leave the article imageless for the durable image job to fill."
    );
  }
}

// Close the coverage-calendar loop (see frontend/docs/COVERAGE_CALENDAR.md).
// Wired in exactly like publication-gate-log.mjs: the gate has already decided
// by the time this runs, the whole thing is wrapped, and neither the module
// failing to load nor the write failing can change the exit code or the
// article that was just published. Worst case we log nothing and the entry is
// closed out by hand with `coverage-calendar.mjs cover`.
try {
  const { closeCalendarLoop } = await import("./coverage-calendar-store.mjs");
  const calendar = await closeCalendarLoop(sql, {
    articleId: id,
    title: article.title,
    body: article.body ?? "",
    publishedOn: isoPrefix,
    explicitEntryId: article.coverage_calendar_id ?? null,
  });
  if (calendar.status === "covered") {
    console.log(`Coverage calendar: marked "${calendar.entryIds[0]}" covered by this article.`);
  } else if (calendar.status === "ambiguous") {
    console.warn(
      `Coverage calendar: ${calendar.entryIds.length} entries match this article `
      + `(${calendar.entryIds.join(", ")}). Nothing marked — close the right one with `
      + `\`node scripts/coverage-calendar.mjs cover <id> --article ${id}\`.`,
    );
  } else if (calendar.status === "unknown-id") {
    console.warn(`Coverage calendar: coverage_calendar_id "${calendar.explicitEntryId}" is not a known entry.`);
  } else if (calendar.status === "error") {
    console.warn(`Coverage calendar not updated (article still published): ${calendar.error}`);
  }
} catch (error) {
  console.warn(
    `Coverage calendar not updated (article still published): ${error instanceof Error ? error.message : String(error)}`,
  );
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

console.log("Published live:");
console.log(JSON.stringify({
  article: row,
  quality: { score: qualityReport.score, possible: qualityReport.possible },
  live_url: `https://columbusrealestatenews.com/blog/${slug}`,
  review_url: `https://columbusrealestatenews.com/admin/articles?edit=${encodeURIComponent(id)}`,
}, null, 2));
