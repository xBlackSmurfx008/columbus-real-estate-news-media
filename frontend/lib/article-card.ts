import type { DbArticle } from '@/lib/public-data';
import { getArticlePath } from '@/lib/article-routing';

/**
 * The only fields a listing card renders.
 *
 * Narrow on purpose. `/blog` renders a card for every live article, and
 * whatever a card receives is serialized into the RSC flight payload that ships
 * inside the HTML. Passing whole `DbArticle` rows would put `body`, `tags`,
 * `meta_description` and `fact_checked_at` on the wire for 95 articles to
 * render a headline and an excerpt.
 */
export type ArticleCardData = {
  id: string;
  href: string;
  title: string;
  excerpt: string | null;
  category: string;
  featured: boolean;
  author: string;
  date: string;
  readTime: string;
  imageUrl: string | null;
};

export function toArticleCardData(article: DbArticle): ArticleCardData {
  return {
    id: article.id,
    href: getArticlePath(article),
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    featured: article.featured,
    author: article.author,
    date: article.date,
    readTime: article.read_time,
    imageUrl: article.image_url,
  };
}

/** Initials for the byline avatar, e.g. "CREN Newsroom" -> "CN". */
export function bylineInitials(author: string): string {
  return author
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('');
}
