#!/usr/bin/env node
// Sends a pipeline-failure alert to the owner's Telegram (CMO directive
// 2026-08-17 P2: the daily pipeline must fail loudly, never silently).
// Usage: node scripts/alert-failure.mjs "what failed and where"
//   or:  some-command || node scripts/alert-failure.mjs "daily run: publish step failed"
// Exits 0 even when Telegram is unconfigured so it can sit in || chains
// without masking the original failure handling; the miss is printed instead.

import { sendTelegramAlert } from "./telegram-alert.mjs";

const summary = process.argv.slice(2).join(" ").trim();
if (!summary) {
  console.error('Usage: node scripts/alert-failure.mjs "what failed and where"');
  process.exit(1);
}

const result = await sendTelegramAlert({ status: "FAILED", summary });
if (result.ok) {
  console.log("Failure alert delivered to Telegram.");
} else {
  console.warn(`Failure alert NOT delivered (${result.error}). Message was: ${summary}`);
}
