import { request } from "node:https";
import { articleLiveUrl, articleReviewUrl } from "./image-pipeline-lib.mjs";

function postTelegram(token, payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    // Telegram requires the token in the Bot API path. Keep it out of a fetch URL,
    // redirects, thrown errors, and all application output.
    const req = request({
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      },
      timeout: 10_000,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => {
        if (chunks.reduce((size, item) => size + item.length, 0) < 64_000) chunks.push(chunk);
      });
      response.on("end", () => {
        try {
          const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          resolve(response.statusCode === 200 && result.ok
            ? { ok: true }
            : { ok: false, error: `TELEGRAM_HTTP_${response.statusCode ?? "UNKNOWN"}` });
        } catch {
          resolve({ ok: false, error: "TELEGRAM_INVALID_RESPONSE" });
        }
      });
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve({ ok: false, error: "TELEGRAM_DELIVERY_FAILED" }));
    req.end(body);
  });
}

export async function sendTelegramAlert({ status, summary, articles = [], linkMode = 'review' }) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
  const icon = status === "COMPLETED" ? "✅" : status === "FAILED" ? "❌" : "⚠️";
  const lines = [`${icon} CREN editorial automation: ${status}`, summary.slice(0, 1_500)];
  for (const article of articles.slice(0, 8)) {
    const link = linkMode === 'live' ? articleLiveUrl(article.title) : articleReviewUrl(article.id);
    lines.push(`${article.title}\n${link}`);
  }
  return postTelegram(token, {
    chat_id: chatId,
    text: lines.join("\n"),
    disable_web_page_preview: false,
  });
}
