import type { EditorialSql, EditorialCandidate } from '../lib/editorial-email-review';
export function stageReviewedImage(sql: EditorialSql, input: {
  articleId: string;
  snapshot: { article_updated_at: unknown; review_updated_at: unknown; submission: unknown };
  candidate: EditorialCandidate;
  fingerprint: { sha256: string; perceptualHash: string };
  model: string;
  cloudLeaseToken?: string | null;
}): Promise<{ articleId: string; status: string }>;
