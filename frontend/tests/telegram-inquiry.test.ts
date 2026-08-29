import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTelegramInquiry, sendTelegramInquiry } from '../lib/telegram-inquiry.ts';

test('membership inquiry formatting includes a durable record and contact details', () => {
  const text = formatTelegramInquiry({
    kind: 'membership',
    recordId: 42,
    name: 'Alex Reader',
    email: 'alex@example.com',
    interests: 'Neighborhood news',
    source: 'join-page',
  });
  assert.match(text, /CREN inquiry: MEMBERSHIP/);
  assert.match(text, /Record: 42/);
  assert.match(text, /alex@example\.com/);
  assert.match(text, /Admin: https:\/\/columbusrealestatenews\.com\/admin\/leads/);
});

test('newsletter inquiry formatting includes subscription preferences', () => {
  const text = formatTelegramInquiry({
    kind: 'newsletter',
    recordId: 77,
    email: 'reader@example.com',
    area: 'Dublin',
    role: 'buyer',
    cadence: 'weekly',
    timeline: '3-6 months',
    budget: '$400k-$600k',
    topic: 'Market data | schools',
    source: 'area-follow | role=buyer',
  });
  assert.match(text, /CREN inquiry: NEWSLETTER/);
  assert.match(text, /Area: Dublin/);
  assert.match(text, /Role: buyer/);
  assert.match(text, /Cadence: weekly/);
  assert.match(text, /Budget: \$400k-\$600k/);
});

test('lead inquiry formatting includes persona and fielded details', () => {
  const text = formatTelegramInquiry({
    kind: 'lead',
    recordId: 88,
    persona: 'fsbo_seller',
    name: 'Sam Seller',
    email: 'sam@example.com',
    phone: '614-555-0100',
    area: 'German Village',
    message: 'timeline: soon | property type: duplex',
    source: 'sell-your-home',
  });
  assert.match(text, /CREN inquiry: LEAD/);
  assert.match(text, /Persona: fsbo_seller/);
  assert.match(text, /Phone: 614-555-0100/);
  assert.match(text, /Area: German Village/);
  assert.match(text, /timeline: soon/);
});

test('notification is a safe no-op when Telegram is not configured', async () => {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  const oldChat = process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  const result = await sendTelegramInquiry({ kind: 'advertising', recordId: 9, email: 'sales@example.com' });
  assert.deepEqual(result, { ok: false, error: 'TELEGRAM_NOT_CONFIGURED' });
  if (oldToken) process.env.TELEGRAM_BOT_TOKEN = oldToken;
  if (oldChat) process.env.TELEGRAM_CHAT_ID = oldChat;
});
