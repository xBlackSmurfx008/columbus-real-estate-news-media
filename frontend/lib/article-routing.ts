/** Fields required to build a public article URL. */
export interface ArticleRoutingFields {
  title: string;
  canonical_slug?: string | null;
}

/** Convert a headline into a readable URL segment. */
export function generateArticleSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/** Return the immutable database slug, with a legacy title fallback. */
export function getArticleSlug(article: ArticleRoutingFields): string {
  return article.canonical_slug || generateArticleSlug(article.title);
}

/** Return the canonical public path for an article. */
export function getArticlePath(article: ArticleRoutingFields): string {
  return `/blog/${getArticleSlug(article)}`;
}
