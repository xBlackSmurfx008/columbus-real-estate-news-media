import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const SNAPSHOT_IMAGE_FIELDS = ['image_url', 'image_alt', 'image_caption'];

/** Existing IDs/order/copy/meta are authoritative; live rows supply images only. */
export function mergeSnapshotImages(snapshot, liveImages) {
  if (!snapshot || !Array.isArray(snapshot.articles) || !snapshot.articles.length || !Array.isArray(liveImages)) {
    throw new Error('INVALID_IMAGE_SNAPSHOT_INPUT');
  }
  const live = new Map();
  for (const row of liveImages) {
    if (!row || typeof row.id !== 'string' || !row.id || live.has(row.id)
      || SNAPSHOT_IMAGE_FIELDS.some(key => !Object.hasOwn(row, key) || (row[key] !== null && typeof row[key] !== 'string'))) {
      throw new Error('INVALID_LIVE_IMAGE_ROW');
    }
    live.set(row.id, row);
  }
  const ids = new Set();
  let changed = 0;
  const articles = snapshot.articles.map(article => {
    if (!article || typeof article.id !== 'string' || !article.id || ids.has(article.id)) throw new Error('INVALID_SNAPSHOT_ARTICLE_ID');
    ids.add(article.id);
    const row = live.get(article.id);
    if (!row) throw new Error('SNAPSHOT_ARTICLE_NOT_LIVE');
    const next = { ...article };
    if (SNAPSHOT_IMAGE_FIELDS.some(key => article[key] !== row[key])) changed++;
    for (const key of SNAPSHOT_IMAGE_FIELDS) next[key] = row[key];
    return next;
  });
  return { snapshot: { ...snapshot, articles }, changed, articles: articles.length, ignoredLiveArticles: live.size - articles.length };
}

/** Read-only unless explicitly applied. Never queries or replaces article copy. */
export async function syncSnapshotImages(sql, snapshotPath, { apply = false } = {}) {
  const original = readFileSync(snapshotPath, 'utf8');
  const liveImages = await sql`SELECT id,image_url,image_alt,image_caption FROM articles WHERE status='live' ORDER BY id`;
  const merged = mergeSnapshotImages(JSON.parse(original), liveImages);
  if (apply && merged.changed) {
    if (readFileSync(snapshotPath, 'utf8') !== original) throw new Error('SNAPSHOT_CHANGED_DURING_IMAGE_SYNC');
    const temporaryPath = `${snapshotPath}.${randomUUID()}.tmp`;
    // Atomic replacement keeps an interrupted write from truncating the fallback.
    writeFileSync(temporaryPath, `${JSON.stringify(merged.snapshot, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    renameSync(temporaryPath, snapshotPath);
  }
  return { ok: true, dryRun: !apply, articles: merged.articles, changed: merged.changed,
    applied: apply ? merged.changed : 0, ignoredLiveArticles: merged.ignoredLiveArticles,
    preservedCopyAndMetadata: true };
}
