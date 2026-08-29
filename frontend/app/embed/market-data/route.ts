import { getLatestMarketObservations, getMarketData } from "@/lib/public-data";

export const revalidate = 300;

// Self-contained iframe widget for third-party sites. Inline CSS on purpose:
// the embed must render identically without the site's stylesheet bundle.
function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function changeColor(direction: string): string {
  if (direction === "up") return "#2E7D4F";
  if (direction === "down") return "#B8432F";
  return "#6b7280";
}

export async function GET() {
  let cards: { label: string; value: string; change: string; direction: string }[] = [];
  try {
    const [data, observations] = await Promise.all([getMarketData(), getLatestMarketObservations()]);
    const cityObservations = observations.filter((observation) =>
      observation.geography_slug === "columbus-citywide" || observation.geography_slug === "united-states"
    );
    cards = cityObservations.length > 0
      ? cityObservations.map((observation) => ({
        label: `${observation.label} · ${observation.period_end}`,
        value: `${observation.geography_label}: ${observation.value_display}`,
        change: observation.source_name,
        direction: "neutral",
      }))
      : data.snapshot.map((m) => ({
        label: m.label,
        value: m.value,
        change: m.change,
        direction: m.direction,
      }));
  } catch {
    cards = [];
  }

  const cardsHtml = cards.length
    ? cards
        .map(
          (c) => `
      <div class="cren-card">
        <p class="cren-label">${escapeHtml(c.label)}</p>
        <p class="cren-value">${escapeHtml(c.value)}</p>
        <p class="cren-change" style="color:${changeColor(c.direction)}">${escapeHtml(c.change)}</p>
      </div>`
        )
        .join("")
    : `<p class="cren-empty">Market data is being updated.</p>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>Columbus Housing Market Data — CRE News</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#1a1a1a}
  .cren-wrap{max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
  .cren-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
  .cren-title{margin:0;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280}
  .cren-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
  .cren-card{border:1px solid #f0f0f0;border-radius:8px;padding:12px;background:#fafafa}
  .cren-label{margin:0;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#6b7280}
  .cren-value{margin:4px 0 0;font-size:20px;font-weight:700;color:#111}
  .cren-change{margin:2px 0 0;font-size:12px;font-weight:600}
  .cren-empty{margin:0;font-size:14px;color:#6b7280}
  .cren-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:12px;border-top:1px solid #f0f0f0;flex-wrap:wrap}
  .cren-src{margin:0;font-size:11px;color:#6b7280}
  .cren-link{font-size:12px;font-weight:700;color:#2E7D4F;text-decoration:none;white-space:nowrap}
  .cren-link:hover{text-decoration:underline}
</style>
</head>
<body>
  <div class="cren-wrap">
    <div class="cren-head">
      <p class="cren-title">Columbus, OH Housing Market</p>
    </div>
    <div class="cren-grid">${cardsHtml}</div>
    <div class="cren-foot">
      <p class="cren-src">Sources: Columbus REALTORS, Zillow Research, Freddie Mac</p>
      <a class="cren-link" href="https://columbusrealestatenews.com/market-data?utm_source=embed&amp;utm_medium=widget" target="_blank" rel="noopener">Data via CRE News &rarr;</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Frame-Options": "ALLOWALL",
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
}
