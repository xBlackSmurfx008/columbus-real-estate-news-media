import { CREN_PUBLIC_BASE_URL } from "./image-pipeline-lib.mjs";
import { ensureImageJobTable, getSql, withRetry } from "./image-job-store.mjs";
import { sendTelegramAlert } from "./telegram-alert.mjs";

export function easternDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function getDailyPublicationHealth(date = new Date()) {
  const sql = getSql();
  await withRetry(() => ensureImageJobTable(sql));
  const dateKey = easternDate(date);
  const rows = await withRetry(() => sql`
    SELECT id, title, image_url
    FROM articles
    WHERE status = 'live'
      AND (created_at AT TIME ZONE 'America/New_York')::date = ${dateKey}::date
    ORDER BY created_at DESC
  `);
  const [drafts] = await withRetry(() => sql`
    SELECT COUNT(*)::int AS count FROM articles WHERE status = 'draft'
  `);
  const publicImageGaps = await withRetry(() => sql`
    SELECT id, title
    FROM articles
    WHERE status = 'live' AND image_url IS NULL
    ORDER BY created_at DESC
  `);
  return {
    dateKey,
    articlesPublished: rows.length,
    imagesMissing: rows.filter((row) => !row.image_url).length,
    articles: rows,
    draftsAwaitingReview: drafts.count,
    publicImagesMissing: publicImageGaps.length,
    publicImageGaps,
  };
}

export async function alertZeroPublishOnce(health) {
  if (health.articlesPublished > 0) return { ok: true, noOp: true };
  const sql = getSql();
  const alertKey = `ZERO_PUBLISH:${health.dateKey}`;
  const existing = await withRetry(() => sql`
    SELECT alert_key FROM newsroom_alert_deliveries WHERE alert_key = ${alertKey}
  `);
  if (existing.length > 0) return { ok: true, noOp: true, alreadyDelivered: true };
  const delivery = await sendTelegramAlert({
    status: "ZERO_PUBLISH",
    summary: `No live CREN article has been published for ${health.dateKey}. ${health.draftsAwaitingReview} draft(s) await editorial review: ${CREN_PUBLIC_BASE_URL}/admin/articles`,
  });
  if (delivery.ok) {
    await withRetry(() => sql`
      INSERT INTO newsroom_alert_deliveries (alert_key) VALUES (${alertKey})
      ON CONFLICT (alert_key) DO NOTHING
    `);
  }
  return delivery;
}

export async function alertPublicImageGapOnce(health) {
  if (health.publicImagesMissing === 0) return { ok: true, noOp: true };
  const sql = getSql();
  const alertKey = `PUBLIC_IMAGE_GAP:${health.dateKey}:${health.publicImageGaps.map((row) => row.id).join(',')}`;
  const existing = await withRetry(() => sql`
    SELECT alert_key FROM newsroom_alert_deliveries WHERE alert_key = ${alertKey}
  `);
  if (existing.length > 0) return { ok: true, noOp: true, alreadyDelivered: true };
  const delivery = await sendTelegramAlert({
    status: 'FAILED',
    summary: `${health.publicImagesMissing} public CREN article(s) are missing a hero image. Repair immediately; publication should never bypass image approval.`,
    articles: health.publicImageGaps,
    linkMode: 'live',
  });
  if (delivery.ok) {
    await withRetry(() => sql`
      INSERT INTO newsroom_alert_deliveries (alert_key) VALUES (${alertKey})
      ON CONFLICT (alert_key) DO NOTHING
    `);
  }
  return delivery;
}
