import { formatTelegramInquiry, type TelegramInquiry } from '@/lib/telegram-inquiry';

// Resend transport for all outbound site email (owner notifications, lead
// replies, CRM sequences). Same contract as the Telegram path: best-effort,
// typed failures, and a missing credential degrades to a logged no-op —
// delivery failure never rolls back a stored record.
//
// Configuration (all optional until email should actually send):
//   RESEND_API_KEY    — Resend secret; absent means EMAIL_NOT_CONFIGURED.
//   RESEND_FROM_EMAIL — verified sender, e.g. "CREN <editor@columbusrealestatenews.com>".
//   LEAD_NOTIFY_EMAIL — where owner notifications go; defaults to the site's
//                       public editor address.
//   EMAIL_REPLY_TO    — Reply-To on outbound mail so answers reach a real inbox.

export interface OutboundEmail {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface EmailDelivery {
  ok: boolean;
  id?: string;
  error?: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_REJECTED' | 'EMAIL_DELIVERY_FAILED';
  detail?: string;
}

const DEFAULT_FROM = 'Columbus Real Estate News <editor@columbusrealestatenews.com>';
const DEFAULT_NOTIFY_TO = 'editor@columbusrealestatenews.com';

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

export function emailReplyToAddress(): string {
  return process.env.EMAIL_REPLY_TO?.trim() || DEFAULT_NOTIFY_TO;
}

export function ownerNotifyAddress(): string {
  return process.env.LEAD_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_TO;
}

function logDelivery(subject: string, to: string | string[], delivery: EmailDelivery) {
  const payload = {
    to: Array.isArray(to) ? to.join(',') : to,
    subject: subject.slice(0, 120),
    status: delivery.ok ? 'delivered' : delivery.error,
    ...(delivery.detail ? { detail: delivery.detail.slice(0, 300) } : {}),
  };
  if (delivery.ok) {
    console.info('CREN_EMAIL_DELIVERED', payload);
  } else {
    console.warn('CREN_EMAIL_FAILED', payload);
  }
}

/** Send one email through Resend. Never throws. */
export async function sendEmail(
  message: OutboundEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailDelivery> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const delivery: EmailDelivery = { ok: false, error: 'EMAIL_NOT_CONFIGURED' };
    logDelivery(message.subject, message.to, delivery);
    return delivery;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        reply_to: message.replyTo || emailReplyToAddress(),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 500);
      const delivery: EmailDelivery = { ok: false, error: 'EMAIL_REJECTED', detail };
      logDelivery(message.subject, message.to, delivery);
      return delivery;
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    const delivery: EmailDelivery = { ok: true, id: payload.id };
    logDelivery(message.subject, message.to, delivery);
    return delivery;
  } catch (error) {
    const delivery: EmailDelivery = {
      ok: false,
      error: 'EMAIL_DELIVERY_FAILED',
      detail: error instanceof Error ? error.message : String(error),
    };
    logDelivery(message.subject, message.to, delivery);
    return delivery;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Owner notification for a new inquiry — the email twin of
 * sendTelegramInquiry, reusing its plain-text formatter so both channels
 * always say the same thing. Best-effort like the Telegram path.
 */
export async function sendEmailInquiry(
  inquiry: TelegramInquiry,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailDelivery> {
  return sendEmail(
    {
      to: ownerNotifyAddress(),
      subject: `New CREN ${inquiry.kind}: ${inquiry.persona ?? inquiry.kind} — ${inquiry.name ?? inquiry.email}`,
      text: formatTelegramInquiry(inquiry),
    },
    fetchImpl,
  );
}
