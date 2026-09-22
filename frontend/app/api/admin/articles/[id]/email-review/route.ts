import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { classifyEditorialReply, ensureEditorialEmailReviewTable, sendEditorialReviewEmail } from '@/lib/editorial-email-review';
import { processEditorialEmailPublication } from '@/lib/editorial-email-publication';
import { revalidatePath } from 'next/cache';

export const maxDuration = 180;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const sql = getDb();
  await ensureEditorialEmailReviewTable(sql);
  const reviews = await sql`
    SELECT version, status, recipient_email, reply_address, outbound_email_id,
      reply_from, reply_text, reviewer, sent_at, replied_at, approved_at, published_at, updated_at
    FROM editorial_email_reviews
    WHERE article_id = ${id}
    ORDER BY version DESC
  `;
  const events = await sql`
    SELECT e.email_id, e.version, e.reply_text, e.decision, e.received_at, a.action,
      (oc.email_id IS NOT NULL) AS owner_confirmed,
      (r.status = 'CHANGES_REQUESTED' AND r.version = (SELECT MAX(version) FROM editorial_email_reviews WHERE article_id = e.article_id)
        AND j.status = 'QUEUED' AND j.attempts = 0 AND j.result IS NULL AND oc.email_id IS NULL) AS recovery_pending
    FROM editorial_email_events e LEFT JOIN editorial_email_event_actions a ON a.email_id = e.email_id
    JOIN editorial_email_reviews r ON r.article_id = e.article_id AND r.version = e.version
    LEFT JOIN editorial_correction_jobs j ON j.email_id = e.email_id
    LEFT JOIN editorial_email_owner_confirmations oc ON oc.email_id = e.email_id
    WHERE e.article_id = ${id} ORDER BY e.received_at DESC
  `;
  const corrections = await sql`SELECT id, version, status, diff, error_code FROM editorial_correction_jobs
    WHERE article_id = ${id} ORDER BY id DESC`;
  const publicationChecks = await sql`SELECT c.email_id, c.status, c.error_code, c.checked_at
    FROM editorial_email_publication_checks c JOIN editorial_email_events e ON e.email_id = c.email_id
    WHERE e.article_id = ${id} ORDER BY c.checked_at DESC`;
  return NextResponse.json({ reviews, events: events.map((event) => ({ ...event,
    approvalRecoveryAvailable: event.recovery_pending === true && event.decision === 'CHANGES_REQUESTED'
      && classifyEditorialReply(String(event.reply_text)).decision === 'APPROVED',
  })), corrections, publicationChecks });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.email.toLowerCase() !== process.env.CREN_EDITOR_REVIEW_EMAIL?.trim().toLowerCase()) {
    return NextResponse.json({ error: 'OWNER_SESSION_REQUIRED' }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  if (body.confirm !== 'retry-verified-email-publication' || typeof body.emailId !== 'string') {
    return NextResponse.json({ error: 'EXPLICIT_CONFIRMATION_REQUIRED' }, { status: 400 });
  }
  const sql = getDb();
  await ensureEditorialEmailReviewTable(sql);
  const [event] = await sql`SELECT email_id, decision FROM editorial_email_events WHERE email_id = ${body.emailId} AND article_id = ${id}`;
  if (!event) return NextResponse.json({ error: 'EMAIL_EVENT_NOT_FOUND' }, { status: 404 });
  try {
    const result = await processEditorialEmailPublication(sql, body.emailId, { apply: true });
    revalidatePath('/', 'layout');
    revalidatePath('/api/public');
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'APPROVAL_FAILED' }, { status: 409 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const result = await sendEditorialReviewEmail(getDb(), id);
    if (!result.delivery.ok) {
      return NextResponse.json({ error: result.delivery.error, detail: result.delivery.detail }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      version: result.version,
      recipient: result.recipient,
      status: 'AWAITING_REPLY',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
