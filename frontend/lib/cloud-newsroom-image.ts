import { buildHeroPrompt } from '../scripts/image-pipeline-lib.mjs';

export const CREN_IMAGE_MODEL = process.env.CREN_IMAGE_MODEL ?? 'openai/gpt-image-2';
export const CREN_OPENAI_IMAGE_MODEL = process.env.CREN_OPENAI_IMAGE_MODEL ?? 'gpt-image-1';

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
  return buildHeroPrompt({ title: input.title, area_slug: input.areaSlug, image_brief: input.imageBrief });
}
