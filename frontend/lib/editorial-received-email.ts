import { classifyEditorialReply } from './editorial-email-review.ts';

type MailVerdict = 'pass' | 'fail' | 'gray' | 'processing_failed' | 'unknown';
export interface ReceivedEditorialEmail {
  id: string;
  from: string;
  to: string[];
  text: string | null;
  created_at: string;
  authentication: { spf: MailVerdict; dkim: MailVerdict; dmarc: MailVerdict } | null;
  attachments?: { content_disposition?: string | null; content_type?: string; content_id?: string | null; size?: number }[];
  [key: string]: unknown;
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAILBOX = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?$/i;

/** Conservative single-mailbox parsing: reject lists, comments and ambiguous syntax. */
function singleMailbox(value: unknown): string {
  if (typeof value !== 'string' || value.length > 500 || /[\r\n\0]/.test(value)) throw new Error('AMBIGUOUS_EMAIL_ADDRESS');
  const trimmed = value.trim();
  if (MAILBOX.test(trimmed)) return trimmed.toLowerCase();
  // Quoted display names may contain commas; unquoted lists may not.
  const named = trimmed.match(/^(?:"(?:[^"\\\r\n]|\\[^\r\n])*"|[^<>";,\r\n]+)\s*<([^<>\s]+)>$/);
  if (!named || !MAILBOX.test(named[1])) throw new Error('AMBIGUOUS_EMAIL_ADDRESS');
  return named[1].toLowerCase();
}

/** Only this authenticated provider fetch supplies trusted server-computed verdicts.
 * Never construct approval input from a webhook body or Authentication-Results header.
 */
export async function fetchReceivedEditorialEmail(emailId: string, options: {
  apiKey: string; fetchImpl?: typeof fetch;
}): Promise<ReceivedEditorialEmail> {
  if (!UUID.test(emailId)) throw new Error('INVALID_RECEIVED_EMAIL_ID');
  if (!options.apiKey?.trim()) throw new Error('RECEIVING_NOT_CONFIGURED');
  const response = await (options.fetchImpl ?? fetch)(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, {
    headers: { authorization: `Bearer ${options.apiKey}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('RECEIVING_FETCH_FAILED');
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) throw new Error('RECEIVED_EMAIL_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('RECEIVED_EMAIL_INVALID');
  const parts: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('RECEIVED_EMAIL_TOO_LARGE'); }
    parts.push(value);
  }
  let received: ReceivedEditorialEmail;
  try { received = JSON.parse(Buffer.concat(parts).toString('utf8')) as ReceivedEditorialEmail; }
  catch { throw new Error('RECEIVED_EMAIL_INVALID'); }
  if (!received || typeof received !== 'object' || Array.isArray(received) || received.id !== emailId
    || typeof received.from !== 'string' || !Array.isArray(received.to) || !received.to.every(value => typeof value === 'string')
    || typeof received.created_at !== 'string' || !Number.isFinite(Date.parse(received.created_at))
    || !(received.text === null || typeof received.text === 'string')) throw new Error('RECEIVED_EMAIL_INVALID');
  return received;
}

/** All replies must authenticate before changing a proof or queuing draft work.
 * DKIM authenticates the sending domain, not a separate human identity; possession
 * of the owner's authenticated mailbox and current proof token is the authority.
 * This verifies transport and intent only. The caller must atomically bind the
 * token to the latest proof, exact candidate hash and unresolved-edit checks.
 */
export function verifyReceivedEditorialReply(received: ReceivedEditorialEmail, owner: string, reviewDomain: string) {
  const sender = singleMailbox(received.from);
  if (sender !== singleMailbox(owner)) throw new Error('EDITORIAL_OWNER_MISMATCH');
  const domain = reviewDomain.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) || !domain.includes('.')) throw new Error('EDITORIAL_REVIEW_DOMAIN_INVALID');
  if (!Array.isArray(received.to) || received.to.length > 50) throw new Error('EDITORIAL_RECIPIENT_AMBIGUOUS');
  const addresses = received.to.map(singleMailbox);
  const proofAddresses = addresses.filter(address => address.split('@')[1] === domain);
  // received_for is parsed from Received headers by Resend; never use it as authority.
  if (proofAddresses.length !== 1) throw new Error('EDITORIAL_RECIPIENT_AMBIGUOUS');
  const token = proofAddresses[0].split('@')[0].match(/^editorial\+([a-f0-9]{36})$/)?.[1];
  if (!token) throw new Error('EDITORIAL_PROOF_TOKEN_INVALID');
  const auth = received.authentication;
  const verdicts = new Set(['pass', 'fail', 'gray', 'processing_failed', 'unknown']);
  if (!auth || typeof auth !== 'object' || !verdicts.has(auth.spf) || !verdicts.has(auth.dkim) || !verdicts.has(auth.dmarc)
    || auth.dkim !== 'pass' || !['pass', 'gray'].includes(auth.dmarc)) throw new Error('EDITORIAL_SENDER_AUTHENTICATION_REQUIRED');
  // Resend's top-level dkim=pass is From-domain aligned. dmarc=gray includes
  // p=none; this does not invalidate independently aligned DKIM. Forwarding may
  // fail SPF, so SPF is preserved as evidence, never used to override DKIM.
  if (!Number.isFinite(Date.parse(received.created_at))) throw new Error('INVALID_RECEIVED_TIMESTAMP');
  return { token, sender, text: received.text ?? '', receivedAt: received.created_at,
    authentication: { source: 'resend-receiving-api' as const, spf: auth.spf, dkim: auth.dkim, dmarc: auth.dmarc } };
}

/** Approval adds explicit intent and attachment checks to the shared sender boundary. */
export function verifyReceivedEditorialApproval(received: ReceivedEditorialEmail, owner: string, reviewDomain: string) {
  const verified = verifyReceivedEditorialReply(received, owner, reviewDomain);
  if (received.attachments !== undefined && !Array.isArray(received.attachments)) throw new Error('EDITORIAL_ATTACHMENTS_REQUIRE_REVIEW');
  const attachments = received.attachments ?? [];
  if (attachments.length > 8 || attachments.some(attachment => !attachment || attachment.content_disposition !== 'inline'
    || !attachment.content_id || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(attachment.content_type ?? '')
    || !Number.isSafeInteger(attachment.size) || Number(attachment.size) < 0 || Number(attachment.size) > 500_000)) {
    throw new Error('EDITORIAL_ATTACHMENTS_REQUIRE_REVIEW');
  }
  if (typeof received.text !== 'string' || classifyEditorialReply(received.text).decision !== 'APPROVED') {
    throw new Error('UNQUALIFIED_EMAIL_APPROVAL_REQUIRED');
  }
  return verified;
}
