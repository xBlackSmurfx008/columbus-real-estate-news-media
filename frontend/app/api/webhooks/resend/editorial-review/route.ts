import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getDb } from '@/lib/db';
import {
  classifyEditorialReply,
  editorialCandidateHash,
  ensureEditorialEmailReviewTable,
  loadEditorialCandidate,
  normalizeEmailAddress,
} from '@/lib/editorial-email-review';
import { sendTelegramAlert } from '@/scripts/telegram-alert.mjs';

export const dynamic = 'force-dynamic';

interface ReceivedEvent {
  type: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    received_for?: string[];
    subject?: string;
  };
}

async function getReceivedEmail(emailId: string) {
  const apiKey = process.env.RESEND_RECEIVING_API_KEY?.trim();
  if (!apiKey) throw new Error('RESEND_RECEIVING_API_KEY_NOT_CONFIGURED');
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`RESEND_RECEIVING_FETCH_${response.status}`);
  return response.json() as Promise<{ text?: string | null; html?: string | null }>;
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_EDITORIAL_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'WEBHOOK_NOT_CONFIGURED' }, { status: 503 });
  const payload = await request.text();
  let event: ReceivedEvent;
  try {
    event = new Webhook(secret).verify(payload, {
      'svix-id': request.headers.get('svix-id') ?? '',
      'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
      'svix-signature': request.headers.get('svix-signature') ?? '',
    }) as ReceivedEvent;
  } catch {
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }
  if (event.type !== 'email.received') return NextResponse.json({ ok: true, ignored: true });

  const emailId = event.data?.email_id?.trim();
  const from = event.data?.from?.trim();
  const receivingDomain = process.env.CREN_EDITOR_REVIEW_DOMAIN?.trim().toLowerCase();
  if (!emailId || !from || !receivingDomain) return NextResponse.json({ error: 'INVALID_RECEIVED_EVENT' }, { status: 400 });
  const addresses = [...(event.data?.to ?? []), ...(event.data?.received_for ?? [])].map((value) => value.toLowerCase());
  const tokenPattern = new RegExp(`^editorial\\+([a-f0-9]{36})@${receivingDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  const token = addresses.map((address) => address.match(tokenPattern)?.[1]).find(Boolean);
  if (!token) return NextResponse.json({ ok: true, ignored: true });

  const sql = getDb();
  await ensureEditorialEmailReviewTable(sql);
  const [review] = await sql`
    SELECT article_id, version, status, recipient_email, candidate_hash
    FROM editorial_email_reviews
    WHERE review_token = ${token}
  `;
  if (!review) return NextResponse.json({ ok: true, ignored: true });
  if (review.status === 'SUPERSEDED' || review.status === 'PUBLISHED') return NextResponse.json({ ok: true, ignored: true });
  const [duplicate] = await sql`SELECT 1 FROM editorial_email_reviews WHERE inbound_email_id = ${emailId}`;
  if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
  if (normalizeEmailAddress(from) !== normalizeEmailAddress(String(review.recipient_email))) {
    return NextResponse.json({ error: 'SENDER_NOT_AUTHORIZED' }, { status: 403 });
  }

  const received = await getReceivedEmail(emailId);
  const parsed = classifyEditorialReply(received.text ?? '');
  if (parsed.decision === 'EMPTY') return NextResponse.json({ error: 'EMPTY_REPLY' }, { status: 422 });

  if (parsed.decision === 'APPROVED') {
    const current = await loadEditorialCandidate(sql, String(review.article_id));
    if (editorialCandidateHash(current) !== review.candidate_hash) {
      await sql`
        UPDATE editorial_email_reviews SET status = 'SUPERSEDED', inbound_email_id = ${emailId},
          reply_from = ${from}, reply_text = ${parsed.reply}, replied_at = NOW(), updated_at = NOW()
        WHERE article_id = ${review.article_id} AND version = ${review.version}
      `;
      return NextResponse.json({ error: 'CANDIDATE_CHANGED_RESEND_PROOF' }, { status: 409 });
    }
    await sql`
      UPDATE editorial_email_reviews SET status = 'APPROVED', inbound_email_id = ${emailId},
        reply_from = ${from}, reply_text = ${parsed.reply}, reviewer = ${normalizeEmailAddress(from)},
        replied_at = NOW(), approved_at = NOW(), updated_at = NOW()
      WHERE article_id = ${review.article_id} AND version = ${review.version}
    `;
    await sendTelegramAlert({
      status: 'COMPLETED',
      summary: `Email approval received for ${String(review.article_id)} version ${String(review.version)}. It is ready for authenticated publication.`,
      articles: [{ id: String(review.article_id), title: current.title }],
    });
    return NextResponse.json({ ok: true, decision: 'APPROVED' });
  }

  await sql`
    UPDATE editorial_email_reviews SET status = 'CHANGES_REQUESTED', inbound_email_id = ${emailId},
      reply_from = ${from}, reply_text = ${parsed.reply}, replied_at = NOW(), updated_at = NOW()
    WHERE article_id = ${review.article_id} AND version = ${review.version}
  `;
  await sendTelegramAlert({
    status: 'ACTION_REQUIRED',
    summary: `Editorial changes were requested by email for ${String(review.article_id)} version ${String(review.version)}. Apply the stored reply, rerun the gate, and send a new proof.`,
  });
  return NextResponse.json({ ok: true, decision: 'CHANGES_REQUESTED' });
}
