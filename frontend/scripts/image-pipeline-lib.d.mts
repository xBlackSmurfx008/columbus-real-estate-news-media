export const CREN_PUBLIC_BASE_URL: string;
export const IMAGE_MODEL: string;
export function buildHeroPrompt(article: { title?: string; area_slug?: string | null; location_name?: string | null; image_brief?: Record<string, unknown> | null }): string;
export function normalizeIllustrationRequest(value: unknown): string;
export function generateArticleSlug(title: string): string;
export function articleLiveUrl(title: string): string;
export function articleReviewUrl(articleId: string): string;
export function selectMissingArticles<T extends { id: string; created_at: string }>(rows: T[], limit: number): T[];
export function safeErrorSummary(error: unknown): string;
