import { articleLiveUrl } from "./image-pipeline-lib.mjs";

export async function sendTelegramAlert({ status, summary, articles = [] }) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
  const icon = status === "COMPLETED" ? "✅" : status === "FAILED" ? "❌" : "⚠️";
  const lines = [`${icon} CREN image automation: ${status}`, summary.slice(0, 1_500)];
  for (const article of articles.slice(0, 8)) {
    lines.push(`${article.title}\n${articleLiveUrl(article.title)}`);
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: false }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, error: `TELEGRAM_HTTP_${response.status}` };
    const body = await response.json();
    return body.ok ? { ok: true } : { ok: false, error: "TELEGRAM_API_REJECTED" };
  } catch {
    return { ok: false, error: "TELEGRAM_DELIVERY_FAILED" };
  }
}
