export type InquiryKind = 'membership' | 'advertising' | 'general' | 'newsletter' | 'lead';

export interface TelegramInquiry {
  kind: InquiryKind;
  recordId: string | number;
  name?: string | null;
  email: string;
  source?: string | null;
  persona?: string | null;
  phone?: string | null;
  area?: string | null;
  role?: string | null;
  topic?: string | null;
  cadence?: string | null;
  timeline?: string | null;
  interests?: string | null;
  company?: string | null;
  packageInterest?: string | null;
  budget?: string | null;
  commuteAnchor?: string | null;
  message?: string | null;
}

export interface TelegramDelivery {
  ok: boolean;
  error?: 'TELEGRAM_NOT_CONFIGURED' | 'TELEGRAM_REJECTED' | 'TELEGRAM_DELIVERY_FAILED';
}

function clean(value: string | null | undefined, limit = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

/** Format a plain-text owner notification without Telegram markup or user-controlled URLs. */
export function formatTelegramInquiry(inquiry: TelegramInquiry) {
  const labels: Record<InquiryKind, string> = {
    membership: 'MEMBERSHIP',
    advertising: 'ADVERTISING',
    general: 'GENERAL',
    newsletter: 'NEWSLETTER',
    lead: 'LEAD',
  };
  const lines = [
    `📬 CREN inquiry: ${labels[inquiry.kind]}`,
    `Record: ${clean(String(inquiry.recordId), 80)}`,
    `Name: ${clean(inquiry.name, 200) || 'Not provided'}`,
    `Email: ${clean(inquiry.email, 320)}`,
  ];
  if (inquiry.persona) lines.push(`Persona: ${clean(inquiry.persona, 120)}`);
  if (inquiry.phone) lines.push(`Phone: ${clean(inquiry.phone, 80)}`);
  if (inquiry.area) lines.push(`Area: ${clean(inquiry.area, 120)}`);
  if (inquiry.role) lines.push(`Role: ${clean(inquiry.role, 80)}`);
  if (inquiry.topic) lines.push(`Topic: ${clean(inquiry.topic, 500)}`);
  if (inquiry.cadence) lines.push(`Cadence: ${clean(inquiry.cadence, 80)}`);
  if (inquiry.timeline) lines.push(`Timeline: ${clean(inquiry.timeline, 80)}`);
  if (inquiry.company) lines.push(`Company: ${clean(inquiry.company, 200)}`);
  if (inquiry.packageInterest) lines.push(`Package: ${clean(inquiry.packageInterest, 120)}`);
  if (inquiry.budget) lines.push(`Budget: ${clean(inquiry.budget, 120)}`);
  if (inquiry.commuteAnchor) lines.push(`Commute: ${clean(inquiry.commuteAnchor, 120)}`);
  if (inquiry.interests) lines.push(`Interests: ${clean(inquiry.interests, 500)}`);
  if (inquiry.message) lines.push(`Message: ${clean(inquiry.message, 900)}`);
  if (inquiry.source) lines.push(`Source: ${clean(inquiry.source, 120)}`);
  lines.push('Admin: https://columbusrealestatenews.com/admin/leads');
  return lines.join('\n');
}

/** Best-effort delivery. Failure never rolls back a successfully stored inquiry. */
export async function sendTelegramInquiry(
  inquiry: TelegramInquiry,
  fetchImpl: typeof fetch = fetch,
): Promise<TelegramDelivery> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { ok: false, error: 'TELEGRAM_NOT_CONFIGURED' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatTelegramInquiry(inquiry),
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    return response.ok ? { ok: true } : { ok: false, error: 'TELEGRAM_REJECTED' };
  } catch {
    return { ok: false, error: 'TELEGRAM_DELIVERY_FAILED' };
  } finally {
    clearTimeout(timer);
  }
}
