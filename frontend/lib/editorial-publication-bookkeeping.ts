import type { EditorialSql } from './editorial-email-review.ts';
import { closeCalendarLoop } from '../scripts/coverage-calendar-store.mjs';

/** Retryable bookkeeping only: never changes public copy or publication authority. */
export async function reconcileEditorialPublication(sql: EditorialSql, articleId: string) {
  try {
    const [article] = await sql`
      SELECT a.title, a.body, j.submission,
        to_char(COALESCE((SELECT MAX(published_at) FROM editorial_email_reviews
          WHERE article_id = a.id AND status = 'PUBLISHED'), a.updated_at)
          AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') AS published_on
      FROM articles a JOIN editorial_review_jobs j ON j.article_id = a.id
      WHERE a.id = ${articleId} AND a.status = 'live'
    `;
    if (!article || typeof article.published_on !== 'string') throw new Error('LIVE_ARTICLE_REQUIRED');
    // Recompute, rather than increment: retries cannot double-count publication.
    await sql`
      UPDATE newsroom_runs SET published_count = (
        SELECT COUNT(*)::int FROM jsonb_array_elements_text(staged_article_ids) AS staged(article_id)
        JOIN articles ON articles.id = staged.article_id WHERE articles.status = 'live'
      ), updated_at = NOW() WHERE staged_article_ids ? ${articleId}
    `;
    const submission = article.submission as Record<string, unknown> | null;
    const calendar = await closeCalendarLoop(sql, {
      articleId, title: String(article.title), body: String(article.body ?? ''),
      publishedOn: article.published_on,
      explicitEntryId: typeof submission?.coverage_calendar_id === 'string' ? submission.coverage_calendar_id : null,
    });
    // The legacy calendar helper returns failures instead of throwing them.
    // Preserve a retry signal; a successful publication must not hide failed bookkeeping.
    if (!['covered', 'already-covered', 'no-match'].includes(calendar.status)) throw new Error('CALENDAR_RECONCILIATION_REQUIRED');
    return { ok: true as const, articleId, calendar };
  } catch {
    throw new Error('EDITORIAL_PUBLICATION_BOOKKEEPING_RETRY');
  }
}
