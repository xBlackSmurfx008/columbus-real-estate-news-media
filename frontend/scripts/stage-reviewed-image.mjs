import { evaluateArticle } from './editorial-quality-lib.mjs';
import { planEditorialImage } from './editorial-image-policy.mjs';

/** One exact draft-image commit shared by sourced files and the cloud fallback worker. */
export async function stageReviewedImage(sql, { articleId, snapshot, candidate, fingerprint, model, cloudLeaseToken = null }) {
  if (candidate.id !== articleId || candidate.image_sha256 !== fingerprint.sha256) throw new Error('IMAGE_ARTIFACT_BINDING_MISMATCH');
  const plan = planEditorialImage(candidate);
  if (plan.mode === 'NEEDS_RESEARCH') throw new Error(plan.reason);
  if ((plan.mode === 'SOURCE_ASSET') !== (model === 'verified-source-asset')) throw new Error('IMAGE_PROVIDER_PROVENANCE_MISMATCH');
  const machine = evaluateArticle(candidate);
  if (!machine.passed) throw new Error('IMAGE_CANDIDATE_GATE_FAILED');
  if (!/^[a-f0-9]{64}$/.test(fingerprint.sha256) || !/^[a-f0-9]{16}$/.test(fingerprint.perceptualHash)) throw new Error('IMAGE_FINGERPRINT_INVALID');
  const [fence] = await sql`SELECT generation::text AS generation FROM editorial_publication_fence WHERE id = 1`;
  const [result] = await sql`
    WITH image_lock AS MATERIALIZED (SELECT generation FROM editorial_publication_fence WHERE id = 1 FOR UPDATE),
    image_job_lock AS MATERIALIZED (
      SELECT j.cloud_lease_token,j.status FROM article_image_jobs j,image_lock
      WHERE j.article_id = ${articleId} AND ${cloudLeaseToken}::uuid IS NOT NULL FOR UPDATE OF j
    ),
    locked AS MATERIALIZED (
      SELECT a.id FROM articles a JOIN editorial_review_jobs r ON r.article_id = a.id, image_lock
      WHERE a.id = ${articleId} AND a.status = 'draft'
        AND image_lock.generation = ${fence?.generation}::bigint
        AND a.updated_at = ${snapshot.article_updated_at}::timestamptz
        AND r.updated_at = ${snapshot.review_updated_at}::timestamptz
        AND r.submission = ${JSON.stringify(snapshot.submission)}::jsonb
        AND r.status IN ('AWAITING_IMAGE','READY_FOR_AUTOMATION','AWAITING_HUMAN_REVIEW','READY_FOR_REVIEW')
        AND (${cloudLeaseToken}::uuid IS NULL OR EXISTS (SELECT 1 FROM image_job_lock j
          WHERE j.status = 'GENERATING' AND j.cloud_lease_token = ${cloudLeaseToken}::uuid))
        AND (a.image_url IS NULL OR a.image_url LIKE '/images/heroes/%' OR a.image_url LIKE '%/placeholder-%')
        AND NOT EXISTS (SELECT 1 FROM article_image_fingerprints f WHERE f.article_id <> ${articleId}
          AND (f.sha256 = ${fingerprint.sha256} OR f.image_url = ${candidate.image_url}
            OR (f.perceptual_hash ~ '^[a-f0-9]{16}$' AND bit_count(('x' || f.perceptual_hash)::bit(64)
              # ('x' || ${fingerprint.perceptualHash})::bit(64)) <= 10)))
        AND NOT EXISTS (SELECT 1 FROM articles WHERE id <> ${articleId} AND image_url = ${candidate.image_url})
      FOR UPDATE OF a, r
    ), attached AS (
      UPDATE articles SET image_url = ${candidate.image_url}, image_alt = ${candidate.image_alt},
        image_caption = ${candidate.image_caption}, updated_at = NOW()
      WHERE id IN (SELECT id FROM locked) RETURNING id
    ), staged AS (
      UPDATE editorial_review_jobs SET submission = ${JSON.stringify(candidate)}::jsonb,
        machine_score = ${machine.score}, machine_possible = ${machine.possible}, machine_report = ${JSON.stringify(machine)}::jsonb,
        status = 'READY_FOR_REVIEW', updated_at = NOW() WHERE article_id IN (SELECT id FROM attached)
    ), fingerprinted AS (
      INSERT INTO article_image_fingerprints(article_id, image_url, sha256, perceptual_hash, verified_at)
      SELECT id, ${candidate.image_url}, ${fingerprint.sha256}, ${fingerprint.perceptualHash}, NOW() FROM attached
      ON CONFLICT(article_id) DO UPDATE SET image_url = EXCLUDED.image_url, sha256 = EXCLUDED.sha256,
        perceptual_hash = EXCLUDED.perceptual_hash, verified_at = NOW()
    ), job AS (
      INSERT INTO article_image_jobs(article_id,status,model,source_sha256,image_url,completed_at,updated_at,cloud_lease_token)
      SELECT id, 'READY_FOR_REVIEW', ${model}, ${fingerprint.sha256}, ${candidate.image_url}, NOW(), NOW(), NULL FROM attached
      ON CONFLICT(article_id) DO UPDATE SET status = EXCLUDED.status, model = EXCLUDED.model,
        source_sha256 = EXCLUDED.source_sha256, image_url = EXCLUDED.image_url, last_error_code = NULL,
        completed_at = NOW(), updated_at = NOW(), cloud_lease_token = NULL
    ), fenced AS (
      UPDATE editorial_publication_fence SET generation = generation + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM attached)
    ) SELECT COUNT(*)::int AS count FROM attached
  `;
  if (result?.count !== 1) throw new Error('IMAGE_ATTACHMENT_CHANGED_STATE_OR_DUPLICATE');
  return { articleId, status: 'READY_FOR_REVIEW' };
}
