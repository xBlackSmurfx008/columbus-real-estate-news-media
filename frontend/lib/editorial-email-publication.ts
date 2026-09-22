import {
  classifyEditorialReply, editorialCandidateHash, loadEditorialCandidate,
  type EditorialSql,
} from './editorial-email-review.ts';
import { evaluateArticle } from '../scripts/editorial-quality-lib.mjs';
import { fingerprintArticleImageUrl } from './article-image-fingerprint-core.ts';
import { fetchReceivedEditorialEmail, verifyReceivedEditorialApproval, type ReceivedEditorialEmail } from './editorial-received-email.ts';
import { reconcileEditorialPublication } from './editorial-publication-bookkeeping.ts';

export const EMAIL_PUBLICATION_POLICY = 'owner-email-approval-v1';
type VerifiedApproval = ReturnType<typeof verifyReceivedEditorialApproval>;
type Options = { apply?: boolean; load?: typeof loadEditorialCandidate; fingerprint?: typeof fingerprintArticleImageUrl };

/** Only called with server-verified provider data, never an HTTP request body.
 * Owner email approval is the human publication decision; no rubric scores are invented.
 */
export async function publishVerifiedEditorialEmail(sql: EditorialSql, emailId: string, verified: VerifiedApproval, options: Options = {}) {
  const owner = process.env.CREN_EDITOR_REVIEW_EMAIL?.trim().toLowerCase();
  if (!owner || verified.sender !== owner || verified.authentication.source !== 'resend-receiving-api'
    || verified.authentication.dkim !== 'pass' || !['pass', 'gray'].includes(verified.authentication.dmarc)) {
    throw new Error('VERIFIED_OWNER_EMAIL_REQUIRED');
  }
  const parsed = classifyEditorialReply(verified.text);
  if (parsed.decision !== 'APPROVED') throw new Error('UNQUALIFIED_EMAIL_APPROVAL_REQUIRED');
  const [event] = await sql`
    SELECT e.*, e.received_at::text AS received_at, p.review_token FROM editorial_email_events e JOIN editorial_email_reviews p
      ON p.article_id = e.article_id AND p.version = e.version WHERE e.email_id = ${emailId}
  `;
  if (!event || event.sender !== owner || event.review_token !== verified.token
    || Date.parse(String(event.received_at)) !== Date.parse(verified.receivedAt)
    || classifyEditorialReply(String(event.reply_text)).reply !== parsed.reply
    || !['APPROVED', 'CHANGES_REQUESTED'].includes(String(event.decision))) throw new Error('APPROVAL_RECEIPT_MISMATCH');
  const id = String(event.article_id);
  const [prior] = await sql`SELECT article_id, version FROM editorial_email_publications WHERE email_id = ${emailId}`;
  if (prior) return { published: false, alreadyPublished: true, articleId: id, version: Number(prior.version) };
  // Snapshot before network/image work; retain PostgreSQL microseconds.
  const [snapshot] = await sql`
    SELECT a.updated_at::text AS article_updated_at, r.updated_at::text AS proof_updated_at,
      j.submission, r.candidate_hash, (SELECT generation::text FROM editorial_publication_fence WHERE id = 1) AS publication_generation
    FROM articles a JOIN editorial_review_jobs j ON j.article_id = a.id
    JOIN editorial_email_reviews r ON r.article_id = a.id AND r.version = ${event.version}
    WHERE a.id = ${id} AND a.status = 'draft' AND j.status = 'READY_FOR_REVIEW'
  `;
  if (!snapshot) throw new Error('ARTICLE_NOT_READY_FOR_EMAIL_PUBLICATION');
  const candidate = await (options.load ?? loadEditorialCandidate)(sql, id).catch((error: unknown) => {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new Error('APPROVAL_IMAGE_FETCH_TIMEOUT');
    throw error;
  });
  const hash = editorialCandidateHash(candidate);
  const machine = evaluateArticle(candidate);
  if (!machine.passed || hash !== snapshot.candidate_hash) throw new Error('APPROVED_PROOF_CHANGED');
  const image = await (options.fingerprint ?? fingerprintArticleImageUrl)(candidate.image_url);
  if (!image || !/^[a-f0-9]{64}$/.test(image.sha256) || !/^[a-f0-9]{16}$/.test(image.perceptualHash)
    || image.sha256 !== candidate.image_sha256) throw new Error('APPROVED_IMAGE_CHANGED_OR_UNREACHABLE');
  const apply = options.apply === true;
  // One transaction consumes this exact authority, retires only a legacy false edit,
  // publishes exact copy, saves the real approval (not scores), and fingerprints it.
  const [result] = await sql`
    WITH image_lock AS MATERIALIZED (SELECT generation FROM editorial_publication_fence WHERE id = 1 FOR UPDATE),
    proof AS MATERIALIZED (
      SELECT r.* FROM editorial_email_reviews r, image_lock
      WHERE r.article_id = ${id} AND r.version = ${event.version} FOR UPDATE OF r
    ), jobs AS MATERIALIZED (
      SELECT j.* FROM editorial_correction_jobs j WHERE j.article_id = ${id} AND j.version = ${event.version}
        AND EXISTS (SELECT 1 FROM proof) FOR UPDATE
    ), artifact AS MATERIALIZED (
      SELECT a.id FROM articles a JOIN editorial_review_jobs j ON j.article_id = a.id
      WHERE a.id = ${id} AND a.status = 'draft' AND a.updated_at = ${snapshot.article_updated_at}::timestamptz
        AND j.status = 'READY_FOR_REVIEW' AND j.submission = ${JSON.stringify(snapshot.submission)}::jsonb
        AND EXISTS (SELECT 1 FROM proof) AND (SELECT COUNT(*) FROM jobs) >= 0 FOR UPDATE OF a, j
    ), eligible AS MATERIALIZED (
      SELECT p.* FROM proof p WHERE p.status IN ('AWAITING_REPLY','CHANGES_REQUESTED','APPROVED')
        AND (SELECT generation FROM image_lock) = ${snapshot.publication_generation}::bigint
        AND p.updated_at = ${snapshot.proof_updated_at}::timestamptz AND p.candidate_hash = ${hash}
        AND p.recipient_email = ${owner} AND p.review_token = ${verified.token}
        AND p.version = (SELECT MAX(version) FROM editorial_email_reviews WHERE article_id = ${id})
        AND EXISTS (SELECT 1 FROM artifact)
        AND NOT EXISTS (SELECT 1 FROM editorial_email_events e WHERE e.article_id = ${id} AND e.version = p.version
          AND e.email_id <> ${emailId} AND (e.decision = 'CHANGES_REQUESTED'
            OR (e.received_at, e.email_id) > (SELECT received_at, email_id FROM editorial_email_events WHERE email_id = ${emailId})))
        AND (${event.decision} = 'APPROVED' OR EXISTS (SELECT 1 FROM jobs WHERE email_id = ${emailId}
          AND status = 'QUEUED' AND attempts = 0 AND result IS NULL AND lease_token IS NULL AND base_hash = ${hash}))
        AND NOT EXISTS (SELECT 1 FROM jobs WHERE email_id <> ${emailId} AND status <> 'STALE')
        AND NOT EXISTS (SELECT 1 FROM article_image_fingerprints f WHERE f.article_id <> ${id}
          AND (f.sha256 = ${image.sha256} OR f.image_url = ${candidate.image_url}
            OR (f.perceptual_hash ~ '^[a-f0-9]{16}$' AND bit_count(('x' || f.perceptual_hash)::bit(64)
              # ('x' || ${image.perceptualHash})::bit(64)) <= 10)))
        AND NOT EXISTS (SELECT 1 FROM articles WHERE id <> ${id} AND image_url = ${candidate.image_url})
    ), audit AS (
      INSERT INTO editorial_email_publications(email_id, article_id, version, candidate_hash, sender, authentication, policy_version)
      SELECT ${emailId}, article_id, version, candidate_hash, ${owner}, ${JSON.stringify(verified.authentication)}::jsonb,
        ${EMAIL_PUBLICATION_POLICY} FROM eligible WHERE ${apply}::boolean ON CONFLICT DO NOTHING RETURNING *
    ), published AS (
      UPDATE articles SET status = 'live', title = ${candidate.title}, excerpt = ${candidate.excerpt}, body = ${candidate.body},
        author = ${candidate.author}, date = ${candidate.date}, category = ${candidate.category},
        read_time = ${candidate.read_time ?? '5 min read'}, area_slug = ${candidate.area_slug ?? null}, topic_slug = ${candidate.topic_slug ?? null},
        tags = ${JSON.stringify(candidate.tags ?? [])}::jsonb, image_url = ${candidate.image_url}, image_alt = ${candidate.image_alt ?? null},
        image_caption = ${candidate.image_caption ?? null}, meta_description = ${candidate.meta_description ?? null},
        fact_checked_at = ${candidate.fact_checked_at ?? null}, updated_at = NOW()
      WHERE id IN (SELECT article_id FROM audit) RETURNING id
    ), fenced AS (
      UPDATE editorial_publication_fence SET generation = generation + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM published)
    ), assessment AS (
      UPDATE editorial_review_jobs SET status = 'APPROVED', submission = ${JSON.stringify(candidate)}::jsonb,
        machine_score = ${machine.score}, machine_possible = ${machine.possible}, machine_report = ${JSON.stringify(machine)}::jsonb,
        human_scores = NULL, human_score = NULL, human_decision = 'APPROVED', reviewer = ${owner}, reviewed_at = NOW(), updated_at = NOW()
      WHERE article_id IN (SELECT id FROM published)
    ), consumed AS (
      UPDATE editorial_email_reviews SET status = 'PUBLISHED', reviewer = ${owner}, reply_from = ${owner},
        reply_text = ${event.reply_text}, replied_at = ${event.received_at}::timestamptz,
        approved_at = NOW(), published_at = NOW(), updated_at = NOW()
      WHERE article_id IN (SELECT id FROM published) AND version = ${event.version}
    ), retired AS (
      UPDATE editorial_correction_jobs SET status = 'STALE', error_code = 'EMAIL_APPROVAL_RECLASSIFIED', updated_at = NOW()
      WHERE email_id = ${emailId} AND article_id IN (SELECT id FROM published) AND ${event.decision} = 'CHANGES_REQUESTED'
    ), image_job AS (
      UPDATE article_image_jobs SET status = 'PUBLISHED', updated_at = NOW() WHERE article_id IN (SELECT id FROM published)
    ), fingerprint AS (
      INSERT INTO article_image_fingerprints(article_id, image_url, sha256, perceptual_hash, verified_at)
      SELECT id, ${candidate.image_url}, ${image.sha256}, ${image.perceptualHash}, NOW() FROM published
      ON CONFLICT(article_id) DO UPDATE SET image_url = EXCLUDED.image_url, sha256 = EXCLUDED.sha256,
        perceptual_hash = EXCLUDED.perceptual_hash, verified_at = NOW()
    ) SELECT (SELECT COUNT(*) FROM eligible) AS eligible_count, (SELECT COUNT(*) FROM published) AS published_count
  `;
  if (Number(result?.eligible_count) !== 1) {
    const [duplicate] = await sql`SELECT article_id FROM editorial_email_publications WHERE email_id = ${emailId}`;
    if (duplicate) return { published: false, alreadyPublished: true, articleId: id, version: Number(event.version) };
    throw new Error('EMAIL_PUBLICATION_BLOCKED_BY_CHANGED_STATE_OR_IMAGE');
  }
  if (apply && Number(result?.published_count) !== 1) {
    const [duplicate] = await sql`SELECT article_id FROM editorial_email_publications WHERE email_id = ${emailId}`;
    if (duplicate) return { published: false, alreadyPublished: true, articleId: id, version: Number(event.version) };
    throw new Error('EMAIL_PUBLICATION_NOT_COMMITTED');
  }
  return { published: apply, dryRun: !apply, articleId: id, version: Number(event.version), title: candidate.title };
}

/** The webhook may reuse its freshly API-fetched receipt to avoid a second rate-limited call.
 * Never pass request body data here. CLI/admin retries always re-fetch from the provider.
 */
export async function processEditorialEmailPublication(sql: EditorialSql, emailId: string, options: { apply?: boolean; providerReceipt?: ReceivedEditorialEmail } = {}) {
  let phase = 'RECEIVING';
  try {
    const received = options.providerReceipt ?? await fetchReceivedEditorialEmail(emailId, { apiKey: process.env.RESEND_RECEIVING_API_KEY ?? '' });
    if (received.id !== emailId) throw new Error('APPROVAL_RECEIPT_MISMATCH');
    phase = 'VERIFYING';
    const verified = verifyReceivedEditorialApproval(received, process.env.CREN_EDITOR_REVIEW_EMAIL ?? '', process.env.CREN_EDITOR_REVIEW_DOMAIN ?? '');
    phase = 'PUBLICATION';
    const result = await publishVerifiedEditorialEmail(sql, emailId, verified, options);
    phase = 'BOOKKEEPING';
    if (options.apply && (result.published || result.alreadyPublished)) await reconcileEditorialPublication(sql, result.articleId);
    if (options.apply) await sql`
      INSERT INTO editorial_email_publication_checks(email_id,status) VALUES (${emailId},'PUBLISHED')
      ON CONFLICT(email_id) DO UPDATE SET status = 'PUBLISHED', error_code = NULL,
        attempts = editorial_email_publication_checks.attempts + 1, checked_at = NOW()
    `;
    return result;
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : `${phase}_RETRY_REQUIRED`;
    console.warn('EDITORIAL_EMAIL_PUBLICATION_FAILED', { phase, code, errorType: error instanceof Error ? error.name : 'Unknown' });
    if (options.apply) await sql`
      INSERT INTO editorial_email_publication_checks(email_id,status,error_code)
      SELECT ${emailId}, CASE WHEN EXISTS (SELECT 1 FROM editorial_email_publications WHERE email_id = ${emailId})
        THEN 'PUBLISHED' ELSE 'BLOCKED' END,
        ${code}
      WHERE EXISTS (SELECT 1 FROM editorial_email_events WHERE email_id = ${emailId})
      ON CONFLICT(email_id) DO UPDATE SET status = EXCLUDED.status, error_code = EXCLUDED.error_code,
        attempts = editorial_email_publication_checks.attempts + 1, checked_at = NOW()
    `;
    throw new Error(code);
  }
}
