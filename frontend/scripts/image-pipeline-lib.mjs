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

export function articleReviewUrl(articleId) {
  return `${CREN_PUBLIC_BASE_URL}/admin/articles?edit=${encodeURIComponent(articleId)}`;
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
  const brief = article.image_brief ?? {};
  const anchors = Array.isArray(brief.story_anchors) ? brief.story_anchors.join('; ') : '';
  return [
    'Use case: illustration-story',
    'Asset type: 16:9 editorial news article hero, clearly an illustration rather than a documentary photograph',
    `Primary request: ${brief.primary_request ?? article.title}`,
    `Editorial idea: ${brief.editorial_idea ?? 'Show the reported change and the constraint or process behind it.'}`,
    `Story-specific anchors that must both be visible: ${anchors}`,
    `Local setting: ${article.location_name ?? article.area_slug ?? 'Columbus'}, Ohio; use plausible Central Ohio built form and season without inventing a recognizable property`,
    'Style/medium: sophisticated contemporary editorial illustration; restrained digital gouache and cut-paper geometry; tactile texture; not photorealistic and not glossy 3D',
    'Composition/framing: one clear focal idea readable at thumbnail size; wide 16:9; important elements within the middle 70 percent for mobile cropping',
    'Color palette: CREN forest green, warm brick, muted cream, charcoal, and one restrained amber accent',
    'Truthfulness: express a relationship, change, scale, or process; do not depict an exact unverified building, person, storefront, map boundary, or final design',
    `Caption context: ${article.image_provenance?.caption ?? 'AI-generated illustration for Columbus Real Estate News.'}`,
    'Constraints: no readable text, signs, logos, brands, watermarks, public figures, identifiable residents, invented renderings, or implied investment results',
    `Avoid: ${[brief.avoid, 'handshakes, keys in a palm, floating coins, upward arrows, glowing house holograms, boardrooms, hardhat-and-blueprint still lifes, generic glass towers, skyline montages, distorted buildings, and busy collages'].filter(Boolean).join('; ')}`,
  ].join("\n");
}

export function safeErrorSummary(error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return message
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/(token|secret|password|key)=[^\s&]+/gi, "$1=[redacted]")
    .slice(0, 500);
}
