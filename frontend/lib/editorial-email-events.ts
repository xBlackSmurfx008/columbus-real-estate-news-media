import { classifyEditorialReply, editorialCandidateHash, loadEditorialCandidate, normalizeEmailAddress, type EditorialSql } from './editorial-email-review.ts';

/** Recover a legacy parser mistake only through the owner's explicit signed-in confirmation.
 * Original receipt/action rows remain immutable; an unstarted false correction is retired atomically.
 */
export async function confirmMisclassifiedEditorialApproval(sql: EditorialSql, emailId: string, actor: string,
  authenticatedApproval = false, load: typeof loadEditorialCandidate = loadEditorialCandidate) {
  const [event] = await sql`SELECT * FROM editorial_email_events WHERE email_id = ${emailId}`;
  if (!event) throw new Error('EMAIL_EVENT_NOT_FOUND');
  const owner = normalizeEmailAddress(actor);
  if (!authenticatedApproval || owner !== normalizeEmailAddress(String(event.sender))) {
    throw new Error('OWNER_AUTHENTICATED_CONFIRMATION_REQUIRED');
  }
  if (event.decision !== 'CHANGES_REQUESTED' || classifyEditorialReply(String(event.reply_text)).decision !== 'APPROVED') {
    throw new Error('NOT_A_MISCLASSIFIED_APPROVAL');
  }
  // Capture both mutable artifacts before loading/hashing (which fetches image bytes).
  // The transaction must still see this exact snapshot after that asynchronous work.
  const [snapshot] = await sql`
    SELECT a.updated_at::text AS article_updated_at, j.submission, r.updated_at::text AS proof_updated_at
    FROM articles a JOIN editorial_review_jobs j ON j.article_id = a.id
    JOIN editorial_email_reviews r ON r.article_id = a.id AND r.version = ${event.version}
    WHERE a.id = ${event.article_id} AND a.status = 'draft' AND j.status = 'READY_FOR_REVIEW'
  `;
  if (!snapshot) return { accepted: false, staleOrReplay: true };
  const hash = editorialCandidateHash(await load(sql, String(event.article_id)));
  const [result] = await sql`
    WITH proof AS MATERIALIZED (
      SELECT * FROM editorial_email_reviews WHERE article_id = ${event.article_id}
        AND version = ${event.version} FOR UPDATE
    ), pending_job AS MATERIALIZED (
      SELECT j.* FROM editorial_correction_jobs j WHERE j.email_id = ${emailId}
        AND EXISTS (SELECT 1 FROM proof) FOR UPDATE
    ), current_artifact AS MATERIALIZED (
      SELECT a.id FROM articles a JOIN editorial_review_jobs j ON j.article_id = a.id
      WHERE a.id = ${event.article_id} AND a.status = 'draft' AND j.status = 'READY_FOR_REVIEW'
        AND a.updated_at = ${snapshot.article_updated_at}::timestamptz
        AND j.submission = ${JSON.stringify(snapshot.submission)}::jsonb
        AND EXISTS (SELECT 1 FROM pending_job) FOR UPDATE OF a, j
    ), eligible AS MATERIALIZED (
      SELECT p.* FROM proof p JOIN pending_job j ON j.article_id = p.article_id AND j.version = p.version
      WHERE p.status = 'CHANGES_REQUESTED' AND p.recipient_email = ${owner} AND p.candidate_hash = ${hash}
        AND p.updated_at = ${snapshot.proof_updated_at}::timestamptz
        AND EXISTS (SELECT 1 FROM current_artifact)
        AND p.version = (SELECT MAX(version) FROM editorial_email_reviews WHERE article_id = p.article_id)
        AND j.status = 'QUEUED' AND j.attempts = 0 AND j.result IS NULL AND j.lease_token IS NULL
        AND j.base_hash = p.candidate_hash
        AND EXISTS (SELECT 1 FROM editorial_email_event_actions WHERE email_id = ${emailId} AND action = 'CHANGES_REQUESTED')
        AND NOT EXISTS (SELECT 1 FROM editorial_email_events e WHERE e.article_id = p.article_id AND e.version = p.version
          AND e.email_id <> ${emailId} AND (e.decision = 'CHANGES_REQUESTED'
            OR (e.received_at, e.email_id) > (SELECT received_at, email_id FROM editorial_email_events WHERE email_id = ${emailId})))
    ), confirmation AS (
      INSERT INTO editorial_email_owner_confirmations(email_id, article_id, version, candidate_hash, actor, reason)
      SELECT ${emailId}, article_id, version, candidate_hash, ${owner}, 'MISCLASSIFIED_APPROVAL' FROM eligible
      ON CONFLICT DO NOTHING RETURNING *
    ), retired AS (
      UPDATE editorial_correction_jobs SET status = 'STALE', error_code = 'OWNER_CONFIRMED_APPROVAL_RECLASSIFICATION', updated_at = NOW()
      WHERE email_id IN (SELECT email_id FROM confirmation) RETURNING id
    ), transitioned AS (
      UPDATE editorial_email_reviews r SET status = 'APPROVED', reviewer = ${owner}, approved_at = NOW(), updated_at = NOW()
      FROM confirmation c WHERE r.article_id = c.article_id AND r.version = c.version
        AND EXISTS (SELECT 1 FROM retired) RETURNING r.status
    ) SELECT status FROM transitioned
  `;
  return result ? { accepted: true, decision: String(result.status) } : { accepted: false, staleOrReplay: true };
}

export async function recordEditorialReply(sql: EditorialSql, input: {
  token: string; emailId: string; webhookId: string; from: string; text: string; receivedAt: string;
}) {
  const parsed = classifyEditorialReply(input.text);
  if (!Number.isFinite(Date.parse(input.receivedAt))) throw new Error('INVALID_RECEIVED_TIMESTAMP');
  const sender = normalizeEmailAddress(input.from);
  // A token + matching From only authorizes untrusted, non-public draft work.
  // Lock the same proof row as approval/publication so a correction cannot slip
  // between their final check and commit.
  const [inserted] = await sql`
    WITH proof AS MATERIALIZED (
      SELECT * FROM editorial_email_reviews WHERE review_token = ${input.token}
        AND recipient_email = ${sender} FOR UPDATE
    ), receipt AS (
      INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
      SELECT ${input.emailId}, ${input.webhookId}, article_id, version, ${sender}, ${parsed.reply}, ${parsed.decision}, ${input.receivedAt}::timestamptz
      FROM proof ON CONFLICT DO NOTHING RETURNING *
    ), revoked AS (
      UPDATE editorial_email_reviews r SET status = 'CHANGES_REQUESTED', approved_at = NULL, reviewer = NULL, updated_at = NOW()
      FROM receipt e WHERE r.article_id = e.article_id AND r.version = e.version AND e.decision = 'CHANGES_REQUESTED'
        AND r.status IN ('SENDING','AWAITING_REPLY','APPROVED','CHANGES_REQUESTED')
        AND r.version = (SELECT MAX(version) FROM editorial_email_reviews WHERE article_id = r.article_id)
    ) SELECT * FROM receipt
  `;
  // Resume a crash after receipt but before application. Reuse only the stored,
  // immutable event tied to this exact proof/sender; never trust a replay body.
  const [stored] = inserted ? [] : await sql`
    SELECT e.* FROM editorial_email_events e JOIN editorial_email_reviews r
      ON r.article_id = e.article_id AND r.version = e.version
    WHERE e.email_id = ${input.emailId} AND e.webhook_id = ${input.webhookId}
      AND r.review_token = ${input.token} AND e.sender = ${sender}
  `;
  const event = inserted ?? stored;
  if (!event) return { accepted: false, duplicateOrUnknown: true };
  if (event.decision === 'CHANGES_REQUESTED') {
    return applyEditorialReply(sql, String(event.email_id), 'untrusted-email-draft-only');
  }
  return { accepted: true, decision: event.decision, senderVerificationRequired: event.decision === 'APPROVED' };
}

export async function applyEditorialReply(sql: EditorialSql, emailId: string, actor: string, authenticatedApproval = false,
  load: typeof loadEditorialCandidate = loadEditorialCandidate) {
  const [event] = await sql`SELECT * FROM editorial_email_events WHERE email_id = ${emailId}`;
  if (!event) throw new Error('EMAIL_EVENT_NOT_FOUND');
  if (event.decision === 'EMPTY') throw new Error('EMPTY_REPLY_REQUIRES_PLAIN_TEXT');
  let hash: string | null = null;
  if (event.decision === 'APPROVED') {
    if (!authenticatedApproval || normalizeEmailAddress(actor) !== normalizeEmailAddress(String(event.sender))) {
      throw new Error('OWNER_AUTHENTICATED_CONFIRMATION_REQUIRED');
    }
    hash = editorialCandidateHash(await load(sql, String(event.article_id)));
  }
  const [result] = await sql`
    WITH proof AS MATERIALIZED (
      SELECT r.* FROM editorial_email_reviews r WHERE article_id = ${event.article_id}
        AND version = ${event.version} FOR UPDATE
    ), eligible AS (
      SELECT p.* FROM proof p WHERE p.version = (SELECT MAX(version) FROM editorial_email_reviews WHERE article_id = p.article_id)
        AND p.status IN ('SENDING', 'AWAITING_REPLY', 'APPROVED', 'CHANGES_REQUESTED')
        AND (${event.decision} <> 'APPROVED' OR (p.status = 'AWAITING_REPLY' AND p.candidate_hash = ${hash}))
        AND (${event.decision} <> 'APPROVED' OR NOT EXISTS (SELECT 1 FROM editorial_email_events e WHERE e.article_id = p.article_id AND e.version = p.version
          AND (e.received_at, e.email_id) > (${event.received_at}::timestamptz, ${emailId})))
    ), action AS (
      INSERT INTO editorial_email_event_actions(email_id, action, actor)
      SELECT ${emailId}, ${event.decision}, ${actor} FROM eligible ON CONFLICT DO NOTHING RETURNING email_id
    ), transitioned AS (
      UPDATE editorial_email_reviews r SET status = ${event.decision}, reply_from = ${event.sender},
        reply_text = ${event.reply_text}, replied_at = NOW(), updated_at = NOW(),
        approved_at = CASE WHEN ${event.decision} = 'APPROVED' THEN NOW() ELSE NULL END,
        reviewer = CASE WHEN ${event.decision} = 'APPROVED' THEN ${actor} ELSE NULL END
      FROM eligible WHERE r.article_id = eligible.article_id AND r.version = eligible.version
        AND EXISTS (SELECT 1 FROM action) RETURNING r.*
    ), job AS (
      INSERT INTO editorial_correction_jobs(email_id, article_id, version, base_hash)
      SELECT ${emailId}, article_id, version, candidate_hash FROM transitioned WHERE ${event.decision} = 'CHANGES_REQUESTED'
      ON CONFLICT DO NOTHING RETURNING id
    ) SELECT status, (SELECT id FROM job) AS job_id FROM transitioned
  `;
  if (!result) return { accepted: false, staleOrReplay: true };
  return { accepted: true, decision: String(result.status), jobId: result.job_id };
}
