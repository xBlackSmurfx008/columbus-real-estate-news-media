import type { EditorialCandidate, EditorialSql } from './editorial-email-review.ts';
import { editorialCandidateHash } from './editorial-email-review.ts';
import { validateHumanReview } from './editorial-review.ts';
import { evaluateArticle } from '../scripts/editorial-quality-lib.mjs';

/** One commit boundary for owner approval, exact artifact, human assessment and publication. */
export async function publishEditorialCandidate(sql: EditorialSql, input: {
  id: string; version: number; hash: string; updatedAt: unknown; stagedSubmission: unknown;
  candidate: EditorialCandidate; reviewer: string; humanScores: Record<string, number>; humanTotal: number;
  machineReport: { score: number; possible: number }; image: { sha256: string; perceptualHash: string };
}) {
  const c = input.candidate;
  const assessment = validateHumanReview(input.humanScores);
  if (!assessment.passed || !input.reviewer.trim() || assessment.total !== input.humanTotal) throw new Error('GENUINE_EDITORIAL_ASSESSMENT_REQUIRED');
  if (!evaluateArticle(c).passed || editorialCandidateHash(c) !== input.hash || c.image_sha256 !== input.image.sha256) throw new Error('EXACT_PUBLICATION_ARTIFACT_REQUIRED');
  const [fence] = await sql`SELECT generation::text AS generation,
    (SELECT updated_at::text FROM editorial_email_reviews WHERE article_id = ${input.id} AND version = ${input.version}) AS proof_updated_at
    FROM editorial_publication_fence WHERE id = 1`;
  if (!fence) throw new Error('EDITORIAL_EMAIL_MIGRATION_REQUIRED');
  return sql`
    WITH image_lock AS MATERIALIZED (SELECT generation FROM editorial_publication_fence WHERE id = 1 FOR UPDATE),
    proof AS MATERIALIZED (
      SELECT r.* FROM editorial_email_reviews r, image_lock WHERE article_id = ${input.id} AND version = ${input.version}
        AND status = 'APPROVED' AND candidate_hash = ${input.hash}
        AND r.updated_at = ${fence.proof_updated_at}::timestamptz FOR UPDATE OF r
    ), snapshot AS MATERIALIZED (
      SELECT a.id FROM articles a JOIN editorial_review_jobs e ON e.article_id = a.id
      WHERE a.id = ${input.id} AND a.updated_at = ${input.updatedAt}
        AND (SELECT generation FROM image_lock) = ${fence.generation}::bigint
        AND NOT EXISTS (SELECT 1 FROM article_image_fingerprints f WHERE f.article_id <> ${input.id}
          AND (f.sha256 = ${input.image.sha256} OR f.image_url = ${c.image_url}
            OR (f.perceptual_hash ~ '^[a-f0-9]{16}$' AND bit_count(('x' || f.perceptual_hash)::bit(64)
              # ('x' || ${input.image.perceptualHash})::bit(64)) <= 10)))
        AND e.status = 'READY_FOR_REVIEW' AND e.submission = ${JSON.stringify(input.stagedSubmission)}::jsonb
        AND EXISTS (SELECT 1 FROM proof p WHERE p.version = (SELECT MAX(version) FROM editorial_email_reviews WHERE article_id = p.article_id))
        AND (EXISTS (SELECT 1 FROM editorial_email_events ev JOIN editorial_email_event_actions ac ON ac.email_id = ev.email_id
          WHERE ev.article_id = ${input.id} AND ev.version = ${input.version} AND ac.action = 'APPROVED'
            AND ev.decision = 'APPROVED' AND ac.actor = (SELECT reviewer FROM proof))
          OR EXISTS (SELECT 1 FROM editorial_email_owner_confirmations oc JOIN editorial_email_events ev ON ev.email_id = oc.email_id
            WHERE oc.article_id = ${input.id} AND oc.version = ${input.version} AND oc.candidate_hash = ${input.hash}
              AND ev.article_id = oc.article_id AND ev.version = oc.version AND ev.sender = oc.actor
              AND oc.actor = (SELECT reviewer FROM proof) AND oc.reason = 'MISCLASSIFIED_APPROVAL'))
        AND NOT EXISTS (SELECT 1 FROM editorial_email_events ev WHERE ev.article_id = ${input.id} AND ev.version = ${input.version}
          AND ev.decision = 'CHANGES_REQUESTED' AND NOT EXISTS (
            SELECT 1 FROM editorial_email_owner_confirmations oc WHERE oc.email_id = ev.email_id
              AND oc.article_id = ev.article_id AND oc.version = ev.version AND oc.candidate_hash = ${input.hash}
              AND oc.actor = ev.sender AND oc.actor = (SELECT reviewer FROM proof) AND oc.reason = 'MISCLASSIFIED_APPROVAL'))
      FOR UPDATE OF a, e
    ), published AS (
      UPDATE articles SET status = 'live', title = ${c.title}, excerpt = ${c.excerpt}, body = ${c.body},
        author = ${c.author}, date = ${c.date}, category = ${c.category},
        read_time = ${c.read_time ?? '5 min read'}, area_slug = ${c.area_slug ?? null}, topic_slug = ${c.topic_slug ?? null},
        tags = ${JSON.stringify(c.tags ?? [])}::jsonb, image_url = ${c.image_url}, image_alt = ${c.image_alt ?? null},
        image_caption = ${c.image_caption ?? null}, meta_description = ${c.meta_description ?? null},
        fact_checked_at = ${c.fact_checked_at ?? null}, updated_at = NOW()
      WHERE id IN (SELECT id FROM snapshot) RETURNING *
    ), fenced AS (
      UPDATE editorial_publication_fence SET generation = generation + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM published)
    ), assessment AS (
      UPDATE editorial_review_jobs SET status = 'APPROVED', submission = ${JSON.stringify(c)}::jsonb,
        machine_score = ${input.machineReport.score}, machine_possible = ${input.machineReport.possible},
        machine_report = ${JSON.stringify(input.machineReport)}::jsonb,
        human_scores = ${JSON.stringify(input.humanScores)}::jsonb, human_score = ${input.humanTotal},
        human_decision = 'APPROVED', reviewer = ${input.reviewer}, reviewed_at = NOW(), updated_at = NOW()
      WHERE article_id IN (SELECT id FROM published)
    ), consumed AS (
      UPDATE editorial_email_reviews SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW()
      WHERE article_id IN (SELECT id FROM published) AND version = ${input.version}
    ), image_job AS (
      UPDATE article_image_jobs SET status = 'PUBLISHED', updated_at = NOW() WHERE article_id IN (SELECT id FROM published)
    ), fingerprint AS (
      INSERT INTO article_image_fingerprints(article_id, image_url, sha256, perceptual_hash, verified_at)
      SELECT id, ${c.image_url}, ${input.image.sha256}, ${input.image.perceptualHash}, NOW() FROM published
      ON CONFLICT(article_id) DO UPDATE SET image_url = EXCLUDED.image_url, sha256 = EXCLUDED.sha256,
        perceptual_hash = EXCLUDED.perceptual_hash, verified_at = NOW()
    ) SELECT * FROM published
  `;
}
