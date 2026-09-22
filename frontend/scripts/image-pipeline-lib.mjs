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

export function normalizeIllustrationRequest(value) {
  return String(value ?? '')
    .replace(/\b(?:documentary|actual|real) photograph\b/gi, 'photographic-style illustration');
}

export function buildHeroPrompt(article) {
  const brief = article.image_brief ?? {};
  const anchors = Array.isArray(brief.story_anchors) ? brief.story_anchors.join('; ') : '';
  return [
    'Use case: photorealistic-natural editorial illustration',
    'Asset type: 16:9 editorial news article hero; natural photographic appearance, disclosed as AI-generated illustration',
    `Primary request: ${normalizeIllustrationRequest(brief.primary_request ?? article.title)}`,
    `Editorial idea: ${brief.editorial_idea ?? 'Show the reported change and the constraint or process behind it.'}`,
    `Story context: ${anchors}. Use only elements that plausibly coexist in one ordinary scene; never force a collage or symbolic objects into a photograph-like setting.`,
    `Local setting: ${article.location_name ?? article.area_slug ?? 'Columbus'}, Ohio; use plausible Central Ohio built form and season without inventing a recognizable property`,
    'Style/medium: photographic-style illustration with believable documentary visual qualities: eye-level public viewpoint, ordinary daylight or soft overcast light, realistic perspective and depth, restrained contrast',
    'Materials: varied weathered brick, realistic siding, imperfect sidewalks, ordinary seasonal Central Ohio planting; natural wear without exaggerated decay; coherent shadows and reflections',
    'Composition/framing: one clear focal idea readable at thumbnail size; wide 16:9; important elements within the middle 70 percent for mobile cropping',
    'Color: neutral white balance and natural local colors; no forced brand palette, cinematic grading, HDR glow, oversaturation, or dramatic golden-hour advertising look',
    'Truthfulness: generic illustrative context only, never evidence of the named property or event. Do not reconstruct an exact building, final design, groundbreaking ceremony, public figure or identifiable resident. Do not invent project signage.',
    'Caption: AI-generated illustration; not a photograph of the actual property or event.',
    'Constraints: no readable text, signs, logos, brands, watermarks, artist signatures, corner marks, dashed or dotted lines, parcel outlines, map overlays, public figures, identifiable residents, invented renderings, or implied investment results',
    `Avoid: ${[brief.avoid, 'painterly texture, digital gouache, cut-paper geometry, cartoon outlines, CGI, glossy architectural renders, plastic surfaces, perfect symmetry, repeated windows or trees, malformed people, handshakes, keys in a palm, floating coins, upward arrows, glowing house holograms, boardrooms, hardhat-and-blueprint still lifes, generic glass towers, skyline montages, distorted buildings, and busy collages'].filter(Boolean).join('; ')}`,
  ].join("\n");
}

export function safeErrorSummary(error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return message
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/(token|secret|password|key)=[^\s&]+/gi, "$1=[redacted]")
    .slice(0, 500);
}
