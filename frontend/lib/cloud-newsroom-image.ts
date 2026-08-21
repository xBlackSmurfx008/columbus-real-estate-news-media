export const CREN_IMAGE_MODEL = process.env.CREN_IMAGE_MODEL ?? 'openai/gpt-image-2';

type ImageBrief = {
  primary_request?: string;
  editorial_idea?: string;
  story_anchors?: string[];
  avoid?: string;
};

export function buildCloudHeroPrompt(input: {
  title: string;
  areaSlug?: string | null;
  imageBrief?: ImageBrief | null;
}): string {
  const brief = input.imageBrief ?? {};
  const anchors = Array.isArray(brief.story_anchors) ? brief.story_anchors.join('; ') : '';
  return [
    'Use case: illustration-story',
    'Asset type: wide 16:9 editorial news article hero for Columbus Real Estate News',
    `Story: ${input.title}`,
    `Primary request: ${brief.primary_request ?? `Create a story-specific editorial illustration for ${input.title}.`}`,
    `Editorial idea: ${brief.editorial_idea ?? 'Show the reported change and the constraint or public process behind it.'}`,
    `Story-specific anchors: ${anchors}`,
    `Local setting: ${input.areaSlug ?? 'Columbus'}, Ohio; use plausible Central Ohio context without depicting a recognizable real property`,
    'Style/medium: sophisticated contemporary editorial illustration; restrained digital gouache and cut-paper geometry; tactile texture; not a documentary photograph or glossy 3D rendering',
    'Composition/framing: one clear focal idea; wide 16:9; keep essential content in the middle 70 percent for mobile cropping',
    'Color palette: CREN forest green, warm brick, muted cream, charcoal, and one restrained amber accent',
    'Constraints: no readable text, signs, logos, brands, watermarks, artist signatures, map labels, parcel boundaries, public figures, identifiable residents, exact unverified buildings, or implied investment results',
    `Avoid: ${[brief.avoid, 'handshakes, keys, money, upward arrows, hardhat-and-blueprint still lifes, generic glass towers, skyline montages, distorted architecture, malformed people, and busy collages'].filter(Boolean).join('; ')}`,
  ].join('\n');
}
