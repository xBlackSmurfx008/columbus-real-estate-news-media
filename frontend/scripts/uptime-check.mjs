#!/usr/bin/env node
// Production uptime check for columbusrealestatenews.com.
//
// Deliberately zero-dependency (plain Node 18+, no node_modules needed)
// so it can run from a bare GitHub Actions checkout or any machine:
//   node frontend/scripts/uptime-check.mjs
//
// Checks:
//   1. Homepage responds 200 AND links to at least one article (/blog/...).
//   2. /blog responds 200 AND lists at least one article.
//   3. If DATABASE_URL is set, a trivial DB query succeeds (dynamic import,
//      skipped otherwise — site checks never depend on DB credentials).
//
// On failure: prints each failure, best-effort Telegram alert if
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set, exits 1.
// The GitHub Actions workflow (.github/workflows/uptime.yml) turns a
// failing run into a GitHub issue, so failures page a human even
// before Telegram credentials exist.

const BASE_URL = (process.env.CREN_BASE_URL || "https://columbusrealestatenews.com").replace(/\/$/, "");
const failures = [];

async function fetchText(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "follow",
    headers: { "user-agent": "CREN-uptime-check/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  return { status: res.status, text };
}

function countArticleLinks(html) {
  return (html.match(/(?:href="|\\")\/blog\/[a-z0-9][a-z0-9-]*/g) || []).length;
}

async function checkPage(path, label) {
  try {
    const { status, text } = await fetchText(path);
    if (status !== 200) {
      failures.push(`${label}: HTTP ${status}`);
      return;
    }
    const links = countArticleLinks(text);
    if (links === 0) {
      failures.push(`${label}: HTTP 200 but zero article links — the page is rendering without content`);
    } else {
      console.log(`OK ${label}: HTTP 200, ${links} article link(s)`);
    }
  } catch (error) {
    failures.push(`${label}: fetch failed (${error instanceof Error ? error.message : String(error)})`);
  }
}

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("SKIP database ping: DATABASE_URL not set");
    return;
  }
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(databaseUrl);
    await sql`SELECT 1`;
    console.log("OK database: SELECT 1 succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`database: query failed (${message.slice(0, 300)})`);
  }
}

async function sendTelegram(summary) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log("SKIP Telegram alert: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: summary }),
      signal: AbortSignal.timeout(10_000),
    });
    console.log(res.ok ? "Telegram alert sent" : `Telegram alert failed: HTTP ${res.status}`);
  } catch (error) {
    console.log(`Telegram alert failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await checkPage("/", "homepage");
await checkPage("/blog", "/blog");
await checkDatabase();

if (failures.length > 0) {
  console.error(`\nUPTIME CHECK FAILED (${BASE_URL}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  await sendTelegram(`CREN uptime check FAILED:\n${failures.map((f) => `- ${f}`).join("\n")}`);
  process.exit(1);
}

console.log("\nAll uptime checks passed.");
