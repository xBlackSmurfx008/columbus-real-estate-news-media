import type { DbArticle } from '@/lib/public-data';

function articleIdentity(article: DbArticle) {
  return article.canonical_slug?.trim().toLowerCase() || article.id || article.title.trim().toLowerCase();
}

function imageIdentity(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    return `${url.origin}${url.pathname}`.toLowerCase();
  } catch {
    return imageUrl.split('?')[0]!.trim().toLowerCase();
  }
}

/**
 * Removes repeated stories and suppresses a repeated image URL on later cards.
 * The newsroom fingerprint gate remains the primary image-integrity control;
 * this is a presentation safeguard for stale or mismatched public data.
 */
export function prepareHomeArticles(articles: DbArticle[]): DbArticle[] {
  const seenArticles = new Set<string>();
  const seenImages = new Set<string>();
  const prepared: DbArticle[] = [];

  for (const article of articles) {
    const identity = articleIdentity(article);
    if (seenArticles.has(identity)) continue;
    seenArticles.add(identity);

    if (!article.image_url) {
      prepared.push(article);
      continue;
    }

    const image = imageIdentity(article.image_url);
    if (seenImages.has(image)) {
      prepared.push({ ...article, image_url: null });
      continue;
    }

    seenImages.add(image);
    prepared.push(article);
  }

  return prepared;
}

export function isLocalLivingArticle(article: DbArticle) {
  const searchable = [article.category, article.topic_slug, article.title, ...(article.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /\b(events?|festivals?|restaurants?|dining|food|entertainment|parks?|arts?|lifestyle|openings?)\b/.test(searchable);
}
