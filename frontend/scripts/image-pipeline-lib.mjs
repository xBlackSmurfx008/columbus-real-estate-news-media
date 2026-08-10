export const CREN_PUBLIC_BASE_URL = "https://columbusrealestatenews.com";
export const IMAGE_MODEL = "codex-subscription-imagegen";

export function generateArticleSlug(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

export function articleLiveUrl(title) {
  return `${CREN_PUBLIC_BASE_URL}/blog/${generateArticleSlug(title)}`;
}

export function selectMissingArticles(rows, limit) {
  if (!Array.isArray(rows) || rows.length === 0 || limit <= 0) return [];
  const newestFirst = [...rows].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
  const selected = [newestFirst[0]];
  for (const row of [...newestFirst].reverse()) {
    if (selected.some((item) => item.id === row.id)) continue;
    selected.push(row);
    if (selected.length >= limit) break;
  }
  return selected.slice(0, limit);
}

export function buildHeroPrompt(article) {
  const location = article.area_slug
    ? `${String(article.area_slug).replaceAll("-", " ")}, Central Ohio`
    : "Columbus, Ohio";
  const context = [article.title, article.excerpt].filter(Boolean).join(" — ");
  return [
    "Use case: photorealistic-natural",
    "Asset type: 16:9 editorial news article hero",
    `Primary request: Create a representative editorial scene for this story: ${context}`,
    `Scene/backdrop: ${location}; architecture, landscape, and weather should feel plausible for Central Ohio`,
    "Style/medium: natural documentary editorial photography with realistic materials; polished but not cinematic or promotional",
    "Composition/framing: wide horizontal composition; one clear focal subject; generous crop room on every edge; important subjects centered within the middle 70 percent",
    "Lighting/mood: believable natural or practical light; calm, factual, observant, and locally grounded",
    "Color palette: restrained neutral colors with subtle brick, steel, wood, asphalt, greenery, or warm interior tones appropriate to the subject",
    "Truthfulness: this is representative editorial art, not a claim to show the exact property, business interior, named person, or construction site",
    "Constraints: no readable text, signs, logos, brand marks, maps, charts, watermarks, public figures, luxury-sales imagery, cash, keys, handshakes, or implied investment returns",
    "Avoid: generic skyline-only scenes, distorted buildings, impossible roads, oversaturated colors, artificial HDR, staged stock-photo smiles, duplicated people, malformed hands, and decorative typography",
  ].join("\n");
}

export function safeErrorSummary(error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return message
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/(token|secret|password|key)=[^\s&]+/gi, "$1=[redacted]")
    .slice(0, 500);
}
