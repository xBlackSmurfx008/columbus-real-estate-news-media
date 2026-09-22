import { open } from 'node:fs/promises';

function validateRecords(records) {
  if (!Array.isArray(records) || !records.length || new Set(records.map(r => r.id)).size !== records.length
    || records.some(r => typeof r.id !== 'string' || !r.id || !/^[a-f0-9]{64}$/.test(r.sha256)
      || !/^[a-f0-9]{16}$/.test(r.perceptual_hash))) throw new Error('INVALID_IMAGE_CLEANUP_RECORDS');
}

/** Run before any Blob upload, including stale SHA ownership inside this batch. */
export function assertLiveImageCleanupPreflight({ records, fingerprints, jobs }) {
  validateRecords(records);
  for (const record of records) {
    if (jobs.filter(job => job.article_id === record.id).length !== 1) throw new Error(`IMAGE_JOB_REQUIRED:${record.id}`);
    const owner = fingerprints.find(row => row.article_id !== record.id && row.sha256 === record.sha256);
    if (owner) throw new Error(`IMAGE_SHA_OWNERSHIP_CONFLICT:${record.id}:${owner.article_id}`);
  }
}

/** Acknowledged Blob uploads are durably journaled before delivery verification. */
export async function journalLiveImageUpload(path, receipt, openFile = open) {
  const handle = await openFile(path, 'a', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(receipt)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Image metadata only; all related rows commit or roll back with the fence. */
export async function commitLiveImageCleanup(sql, { records, generation, batch }) {
  validateRecords(records);
  if (!/^\d+$/.test(String(generation)) || !/^[a-f0-9-]{36}$/.test(batch)) throw new Error('INVALID_IMAGE_CLEANUP_AUTHORITY');
  const [result] = await sql`
    WITH image_lock AS MATERIALIZED (SELECT generation FROM editorial_publication_fence WHERE id=1 FOR UPDATE),
    input AS MATERIALIZED (SELECT * FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb)
      AS x(id text,expected_url text,snapshot_updated_at text,image_url text,image_alt text,image_caption text,
        sha256 text,perceptual_hash text,replacement boolean,before_image jsonb,provenance jsonb,visual_review jsonb)),
    locked AS MATERIALIZED (SELECT a.id FROM articles a JOIN input i ON i.id=a.id,image_lock
      WHERE a.status='live' AND a.image_url=i.expected_url AND a.updated_at=i.snapshot_updated_at::timestamptz
        AND image_lock.generation=${generation}::bigint FOR UPDATE OF a),
    locked_jobs AS MATERIALIZED (SELECT j.article_id FROM article_image_jobs j JOIN locked a ON a.id=j.article_id
      FOR UPDATE OF j),
    eligible AS MATERIALIZED (SELECT COUNT(*)=${records.length}
      AND (SELECT COUNT(*) FROM articles WHERE status='live')=${records.length}
      AND (SELECT COUNT(*) FROM locked_jobs)=${records.length}
      AND NOT EXISTS (SELECT 1 FROM audit_logs WHERE source_route=${batch} AND action='IMAGE_ONLY_CLEANUP') AS ok FROM locked),
    changed AS (UPDATE articles a SET image_url=i.image_url,image_alt=i.image_alt,image_caption=i.image_caption,updated_at=NOW()
      FROM input i WHERE a.id=i.id AND (SELECT ok FROM eligible) RETURNING a.id),
    fingerprinted AS (INSERT INTO article_image_fingerprints(article_id,image_url,sha256,perceptual_hash,verified_at)
      SELECT i.id,i.image_url,i.sha256,i.perceptual_hash,NOW() FROM input i JOIN changed c ON c.id=i.id
      ON CONFLICT(article_id) DO UPDATE SET image_url=EXCLUDED.image_url,sha256=EXCLUDED.sha256,
        perceptual_hash=EXCLUDED.perceptual_hash,verified_at=NOW() RETURNING article_id),
    jobs AS (UPDATE article_image_jobs j SET image_url=i.image_url,source_sha256=i.sha256,
      model=CASE WHEN i.replacement THEN 'verified-source-photo-cleanup' ELSE j.model END,
      status='PUBLISHED',last_error_code=NULL,cloud_lease_token=NULL,claim_token=NULL,lease_expires_at=NULL,
      visual_review=CASE WHEN i.replacement THEN i.visual_review ELSE j.visual_review END,
      completed_at=NOW(),updated_at=NOW()
      FROM input i JOIN changed c ON c.id=i.id WHERE j.article_id=i.id RETURNING j.article_id),
    receipts AS (INSERT INTO audit_logs(actor_type,actor_id,entity_type,entity_id,action,source_route,before_json,after_json)
      SELECT 'owner-authorized-agent','CREN image desk','article_image',i.id,'IMAGE_ONLY_CLEANUP',${batch},i.before_image,
        jsonb_build_object('image_url',i.image_url,'image_alt',i.image_alt,'image_caption',i.image_caption,
          'sha256',i.sha256,'perceptual_hash',i.perceptual_hash,'provenance',i.provenance,
          'visual_review',i.visual_review,'article_copy_unchanged',true)
      FROM input i JOIN changed c ON c.id=i.id RETURNING entity_id),
    fenced AS (UPDATE editorial_publication_fence SET generation=generation+1 WHERE id=1 AND EXISTS(SELECT 1 FROM changed))
    SELECT (SELECT COUNT(*)::int FROM changed) AS changed,
      (SELECT COUNT(*)::int FROM fingerprinted) AS fingerprints,
      (SELECT COUNT(*)::int FROM jobs) AS jobs,
      (SELECT COUNT(*)::int FROM receipts) AS receipts
  `;
  if (!result || Number(result.changed) !== records.length) throw new Error('LIVE_CORPUS_CHANGED_NO_DATABASE_REPAIR_APPLIED');
  if (['fingerprints', 'jobs', 'receipts'].some(key => Number(result[key]) !== records.length)) {
    // Unexpected triggers/schema changes must not be reported as a verified cleanup.
    throw new Error('IMAGE_CLEANUP_COMMIT_COUNTS_REQUIRE_RECONCILIATION');
  }
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, Number(value)]));
}

const normalize = value => value instanceof Date ? value.toISOString()
  : Array.isArray(value) ? value.map(normalize)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
const same = (left, right) => JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
const copyOnly = article => Object.fromEntries(Object.entries(article)
  .filter(([key]) => !['image_url','image_alt','image_caption','updated_at','snapshot_updated_at'].includes(key)));
const isNull = value => value == null || value === ''; // psql fixture CSV represents NULL as empty.

/** Read back independently; a committed batch is not reported verified on counts alone. */
export async function verifyLiveImageCleanup(sql, { records, articles, beforeJobs, batch }) {
  const ids = JSON.stringify(records.map(record => record.id));
  const [after, fingerprints, jobs, receipts] = await Promise.all([
    sql`SELECT * FROM articles WHERE status='live' ORDER BY id`,
    sql`SELECT * FROM article_image_fingerprints WHERE article_id IN (SELECT jsonb_array_elements_text(${ids}::jsonb))`,
    sql`SELECT * FROM article_image_jobs WHERE article_id IN (SELECT jsonb_array_elements_text(${ids}::jsonb))`,
    sql`SELECT * FROM audit_logs WHERE source_route=${batch} AND action='IMAGE_ONLY_CLEANUP'`,
  ]);
  if (after.length !== articles.length || after.some(article => {
    const prior = articles.find(row => row.id === article.id);
    return !prior || !same(copyOnly(article), copyOnly(prior));
  })) throw new Error('POST_REPAIR_COPY_VERIFICATION_FAILED');
  if ([after, fingerprints, jobs, receipts].some(rows => rows.length !== records.length)) {
    throw new Error('POST_REPAIR_IMAGE_ROW_COUNTS_FAILED');
  }
  for (const record of records) {
    const article = after.find(row => row.id === record.id);
    const fingerprint = fingerprints.find(row => row.article_id === record.id);
    const job = jobs.find(row => row.article_id === record.id);
    const receipt = receipts.find(row => row.entity_id === record.id);
    const priorJob = beforeJobs.find(row => row.article_id === record.id);
    const metadata = { image_url: record.image_url, image_alt: record.image_alt, image_caption: record.image_caption };
    const expectedReview = record.replacement ? record.visual_review : priorJob?.visual_review;
    const reviewMatches = job && ((isNull(job.visual_review) && isNull(expectedReview)) || same(job.visual_review, expectedReview));
    if (!article || !Object.entries(metadata).every(([key, value]) => article[key] === value)
      || !fingerprint || fingerprint.image_url !== record.image_url || fingerprint.sha256 !== record.sha256
      || fingerprint.perceptual_hash !== record.perceptual_hash || !fingerprint.verified_at
      || !job || job.image_url !== record.image_url || job.source_sha256 !== record.sha256 || job.status !== 'PUBLISHED'
      || job.model !== (record.replacement ? 'verified-source-photo-cleanup' : priorJob?.model)
      || !job.completed_at || !isNull(job.last_error_code) || !isNull(job.cloud_lease_token)
      || !isNull(job.claim_token) || !isNull(job.lease_expires_at)
      || !reviewMatches
      || !receipt || receipt.actor_type !== 'owner-authorized-agent' || receipt.actor_id !== 'CREN image desk'
      || receipt.entity_type !== 'article_image' || !same(receipt.before_json, record.before_image)
      || !same(receipt.after_json, { ...metadata, sha256: record.sha256, perceptual_hash: record.perceptual_hash,
        provenance: record.provenance ?? null, visual_review: record.visual_review ?? null, article_copy_unchanged: true })) {
      throw new Error(`POST_REPAIR_IMAGE_VERIFICATION_FAILED:${record.id}`);
    }
  }
  return { verifiedCopyUnchanged: true, verifiedImageMetadata: true, verifiedFingerprints: true,
    verifiedImageJobs: true, verifiedAuditReceipts: receipts.length };
}
