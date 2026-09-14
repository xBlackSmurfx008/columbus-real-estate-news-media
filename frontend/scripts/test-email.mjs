#!/usr/bin/env node
// Smoke test for the Resend email transport.
// Sends ONE plain-text test message so the owner can verify the API key and
// the sending domain before real lead replies depend on them.
//
// Usage:
//   RESEND_API_KEY=... node scripts/test-email.mjs --to you@example.com
//
// Optional: RESEND_FROM_EMAIL overrides the default verified sender.
// Exits nonzero on any failure and prints Resend's error body verbatim.

const toFlag = process.argv.indexOf("--to");
const to = toFlag !== -1 ? process.argv[toFlag + 1] : null;
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("Usage: RESEND_API_KEY=... node scripts/test-email.mjs --to you@example.com");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY?.trim();
if (!apiKey) {
  console.error("RESEND_API_KEY is not set. Get one at https://resend.com/api-keys and verify the sending domain first.");
  process.exit(1);
}

const from = process.env.RESEND_FROM_EMAIL?.trim() || "Columbus Real Estate News <editor@columbusrealestatenews.com>";

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "CREN email transport test",
    text:
      "This is a test message from the Columbus Real Estate News email transport (Resend).\n\n" +
      "If you are reading this, RESEND_API_KEY works and the sending domain is verified. " +
      "Lead replies from /admin/leads and owner notifications on new inquiries will deliver.\n\n" +
      `Sent ${new Date().toISOString()} from scripts/test-email.mjs.`,
  }),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Resend rejected the send (HTTP ${response.status}):\n${body}`);
  console.error("\nMost common cause: the sending domain is not verified in Resend (resend.com/domains).");
  process.exit(1);
}
console.log(`Sent. Resend response: ${body}`);
console.log(`Check the ${to} inbox (and spam folder on the very first send).`);
