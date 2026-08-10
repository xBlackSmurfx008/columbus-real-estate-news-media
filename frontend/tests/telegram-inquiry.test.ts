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
