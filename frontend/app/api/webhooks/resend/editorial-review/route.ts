import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getDb } from '@/lib/db';
import { recordEditorialReply } from '@/lib/editorial-email-events';
import { classifyEditorialReply } from '@/lib/editorial-email-review';
import { fetchReceivedEditorialEmail, verifyReceivedEditorialReply } from '@/lib/editorial-received-email';
import { processEditorialEmailPublication } from '@/lib/editorial-email-publication';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;
interface ReceivedEvent { type: string; data?: { email_id?: string; from?: string; to?: string[]; received_for?: string[] } }

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_EDITORIAL_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'WEBHOOK_NOT_CONFIGURED' }, { status: 503 });
  const payload = await request.text();
  if (payload.length > 100_000) return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  let event: ReceivedEvent;
  try {
    event = new Webhook(secret).verify(payload, {
      'svix-id': request.headers.get('svix-id') ?? '',
      'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
      'svix-signature': request.headers.get('svix-signature') ?? '',
    }) as ReceivedEvent;
  } catch { return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 }); }
  if (event.type !== 'email.received') return NextResponse.json({ ok: true, ignored: true });
  const emailId = event.data?.email_id;
  const domain = process.env.CREN_EDITOR_REVIEW_DOMAIN?.toLowerCase();
  if (!emailId || !domain) return NextResponse.json({ error: 'INVALID_RECEIVED_EVENT' }, { status: 400 });
  const owner = process.env.CREN_EDITOR_REVIEW_EMAIL?.trim();
  if (!owner) return NextResponse.json({ error: 'EDITORIAL_OWNER_NOT_CONFIGURED' }, { status: 503 });
  const apiKey = process.env.RESEND_RECEIVING_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RECEIVING_NOT_CONFIGURED' }, { status: 503 });
  try {
    const received = await fetchReceivedEditorialEmail(emailId, { apiKey });
    let verified: ReturnType<typeof verifyReceivedEditorialReply>;
    try {
      verified = verifyReceivedEditorialReply(received, owner, domain);
    } catch (error) {
      // A signed webhook authenticates Resend delivery, not the email sender.
      // Permanent sender/recipient rejection must not revoke a proof, create an
      // event/job, or cause repeated provider retries. No raw email is logged.
      const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
        ? error.message : 'EDITORIAL_REPLY_AUTHENTICATION_FAILED';
      if (!['AMBIGUOUS_EMAIL_ADDRESS', 'EDITORIAL_OWNER_MISMATCH', 'EDITORIAL_RECIPIENT_AMBIGUOUS',
        'EDITORIAL_PROOF_TOKEN_INVALID', 'EDITORIAL_SENDER_AUTHENTICATION_REQUIRED', 'INVALID_RECEIVED_TIMESTAMP'].includes(code)) throw error;
      console.warn('EDITORIAL_REPLY_REJECTED', { code });
      return NextResponse.json({ ok: true, ignored: true, reason: 'UNVERIFIED_EDITORIAL_REPLY' });
    }
    // API-fetched body/timestamp, never caller-supplied headers. HTML and attachments
    // are not executed or forwarded to a model. Empty plain text is reviewable in admin.
    const sql = getDb();
    const result = await recordEditorialReply(sql, {
      token: verified.token, emailId, webhookId: request.headers.get('svix-id')!, from: verified.sender,
      text: verified.text, receivedAt: verified.receivedAt,
    });
    if ((result.accepted || 'staleOrReplay' in result) && classifyEditorialReply(received.text ?? '').decision === 'APPROVED') {
      const publication = await processEditorialEmailPublication(sql, emailId, { apply: true, providerReceipt: received });
      revalidatePath('/', 'layout');
      revalidatePath('/api/public');
      return NextResponse.json({ ok: true, ...result, confirmationRequired: false, ...publication });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.warn('EDITORIAL_WEBHOOK_RETRY', { code: error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message : 'RECEIVING_OR_RECEIPT_RETRY_REQUIRED', errorType: error instanceof Error ? error.name : 'Unknown' });
    return NextResponse.json({ error: 'EDITORIAL_RECEIPT_RETRY_REQUIRED' }, { status: 503 });
  }
}
