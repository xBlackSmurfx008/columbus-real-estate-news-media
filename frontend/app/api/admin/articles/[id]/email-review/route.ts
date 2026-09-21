import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureEditorialEmailReviewTable, sendEditorialReviewEmail } from '@/lib/editorial-email-review';

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
  return NextResponse.json({ reviews });
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
