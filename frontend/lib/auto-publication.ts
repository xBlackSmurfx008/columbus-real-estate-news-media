import { isDurableArticleImageUrl } from './article-image.ts';
import { evaluateArticle } from '../scripts/editorial-quality-lib.mjs';

export const AUTO_PUBLICATION_REVIEW_STATUSES = [
  'READY_FOR_AUTOMATION',
  'AWAITING_HUMAN_REVIEW',
] as const;

const PUBLICATION_FIELDS = [
  'title',
  'category',
  'excerpt',
  'body',
  'author',
  'date',
  'read_time',
  'area_slug',
  'topic_slug',
  'tags',
  'image_url',
  'meta_description',
  'image_alt',
  'fact_checked_at',
] as const;

type PublicationRecord = Record<string, unknown>;

function comparableValue(field: string, value: unknown): string {
  if (field === 'tags') {
    return JSON.stringify(Array.isArray(value) ? value : []);
  }
  if (field === 'fact_checked_at' && value) {
    const timestamp = new Date(String(value)).getTime();
    return Number.isNaN(timestamp) ? String(value) : String(timestamp);
  }
  return value == null ? '' : String(value);
}

export function publicationCopyMatches(
  article: PublicationRecord,
  submission: PublicationRecord,
): boolean {
  return PUBLICATION_FIELDS.every((field) =>
    comparableValue(field, article[field]) === comparableValue(field, submission[field]));
}

export function validateAutoPublicationCandidate(input: {
  article: PublicationRecord;
  reviewStatus: unknown;
  submission: unknown;
  fingerprint: PublicationRecord | null;
}) {
  const submission = input.submission && typeof input.submission === 'object'
    ? input.submission as PublicationRecord
    : null;
  const machineReport = submission ? evaluateArticle(submission) : null;
  const imageUrl = submission?.image_url;
  const reasons: string[] = [];

  if (input.article.status !== 'draft') reasons.push('ARTICLE_NOT_DRAFT');
  if (!AUTO_PUBLICATION_REVIEW_STATUSES.includes(input.reviewStatus as never)) {
    reasons.push('REVIEW_JOB_NOT_READY');
  }
  if (!submission) reasons.push('STAGED_SUBMISSION_MISSING');
  if (!machineReport?.passed) reasons.push('MACHINE_GATE_FAILED');
  if (submission && !publicationCopyMatches(input.article, submission)) {
    reasons.push('ARTICLE_DOES_NOT_MATCH_STAGED_SUBMISSION');
  }
  if (!isDurableArticleImageUrl(imageUrl) || input.article.image_url !== imageUrl) {
    reasons.push('DURABLE_IMAGE_NOT_ATTACHED');
  }
  if (!input.fingerprint
    || input.fingerprint.image_url !== imageUrl
    || !input.fingerprint.sha256
    || !input.fingerprint.perceptual_hash) {
    reasons.push('IMAGE_FINGERPRINT_NOT_VERIFIED');
  }

  return {
    ready: reasons.length === 0,
    reasons,
    machineReport,
    submission,
  };
}
