// Deterministic branded editorial card for articles that have no hero yet.
// Policy (owner, 2026-08-14): every live article must carry a hero image.
// When the illustration pipeline can't supply one immediately, this card is
// attached at once as a clearly-labeled placeholder; the local illustration
// job later replaces it (list-missing-images.mjs treats these as missing).
// No network, no fonts beyond the system serif — safe to run in any session.

import sharp from "sharp";

const WIDTH = 1600;
const HEIGHT = 900;

// Category accent colors on the CREN palette (cren-v2.css).
const CATEGORY_ACCENTS = {
  "market analysis": "#D4A429",
  "market trends": "#D4A429",
  "development": "#7FB69E",
  "economic impact": "#C9A84C",
  "neighborhoods": "#8FBF9F",
  "rental market": "#A3C4B4",
  "commercial": "#B8A26B",
  "lifestyle": "#D9B65E",
  "local politics": "#9FB8AC",
};

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// Greedy word wrap tuned for the serif at the chosen size.
function wrapTitle(title, maxCharsPerLine, maxLines) {
  const words = String(title).trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[.,;:]?$/, "")}…`;
    return kept;
  }
  return lines;
}

export function buildCardSvg({ title, category = "", areaLabel = "" }) {
  const accent = CATEGORY_ACCENTS[String(category).toLowerCase()] ?? "#D4A429";
  // Longer titles get a smaller size and tighter wrap. Wrap widths are sized
  // for DejaVu Serif Bold (~0.68em average advance) inside 110px side margins.
  const length = String(title).length;
  const fontSize = length > 110 ? 58 : length > 75 ? 68 : 78;
  const maxChars = length > 110 ? 33 : length > 75 ? 28 : 25;
  const lines = wrapTitle(title, maxChars, 4);
  const lineHeight = Math.round(fontSize * 1.18);
  const blockHeight = lines.length * lineHeight;
  const firstBaseline = Math.round((HEIGHT - blockHeight) / 2 + fontSize * 0.85) + 30;

  const titleSpans = lines
    .map((line, i) =>
      `<text x="110" y="${firstBaseline + i * lineHeight}" font-family="'DejaVu Serif', Georgia, serif" font-weight="bold" font-size="${fontSize}" fill="#FFFFFF">${escapeXml(line)}</text>`
    )
    .join("\n  ");

  const kicker = [category, areaLabel].filter(Boolean).join("  ·  ").toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0F2E24"/>
      <stop offset="0.55" stop-color="#1B4D3E"/>
      <stop offset="1" stop-color="#245847"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1470" cy="130" r="420" fill="${accent}" opacity="0.07"/>
  <circle cx="1470" cy="130" r="300" fill="${accent}" opacity="0.06"/>
  <rect x="110" y="150" width="72" height="6" fill="${accent}"/>
  <text x="110" y="205" font-family="'DejaVu Sans', Arial, sans-serif" font-weight="bold" font-size="30" letter-spacing="6" fill="#E8F0ED">COLUMBUS REAL ESTATE NEWS</text>
  ${kicker ? `<text x="110" y="258" font-family="'DejaVu Sans', Arial, sans-serif" font-size="26" letter-spacing="4" fill="${accent}">${escapeXml(kicker)}</text>` : ""}
  ${titleSpans}
  <rect x="0" y="${HEIGHT - 92}" width="${WIDTH}" height="92" fill="#0C241C"/>
  <text x="110" y="${HEIGHT - 36}" font-family="'DejaVu Sans', Arial, sans-serif" font-size="24" fill="#9FB8AC">columbusrealestatenews.com</text>
  <text x="${WIDTH - 110}" y="${HEIGHT - 36}" text-anchor="end" font-family="'DejaVu Sans', Arial, sans-serif" font-size="24" fill="#9FB8AC">CREN editorial graphic</text>
</svg>`;
}

export async function generateCardWebp(article) {
  const svg = buildCardSvg(article);
  return sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer();
}

export const PLACEHOLDER_CAPTION = "CREN editorial graphic (placeholder pending illustration)";

export function humanizeAreaSlug(slug) {
  if (!slug || slug === "no-area") return "";
  return String(slug).split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Generates the card and hosts it. Prefers Vercel Blob (live instantly, same
// store the illustration job uses) when BLOB_READ_WRITE_TOKEN is set; falls
// back to frontend/public/images/heroes/, which only serves after the next
// deploy — callers must surface `deployNeeded` when it is true.
export async function hostPlaceholderCard(article) {
  const buffer = await generateCardWebp({
    title: article.title,
    category: article.category,
    areaLabel: humanizeAreaSlug(article.area_slug),
  });

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const { createHash } = await import("node:crypto");
    const sha = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const blob = await put(`cren/articles/${article.id}/placeholder-${sha}.webp`, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/webp",
      cacheControlMaxAge: 31_536_000,
    });
    const check = await fetch(blob.url, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
    if (!check.ok || !(check.headers.get("content-type") ?? "").startsWith("image/")) {
      throw new Error("PLACEHOLDER_BLOB_VERIFICATION_FAILED");
    }
    return { url: blob.url, deployNeeded: false, bytes: buffer.length };
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const outDir = resolve(process.cwd(), "public/images/heroes");
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, `${article.id}.webp`), buffer);
  return { url: `/images/heroes/${article.id}.webp`, deployNeeded: true, bytes: buffer.length };
}
