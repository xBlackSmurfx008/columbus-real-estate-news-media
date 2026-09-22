export const IMAGE_POLICY_VERSION: string;
export const AI_IMAGE_CAPTION: string;
export function planEditorialImage(article: unknown): { mode: 'NEEDS_RESEARCH' | 'AI_FALLBACK' | 'SOURCE_ASSET'; reason: string };
export function validateImageAttachmentReview(review: unknown, articleId: string, sourceSha256: string): ReturnType<typeof planEditorialImage>;
