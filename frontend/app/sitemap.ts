import type { MetadataRoute } from 'next';
import { areas, topics } from '@/lib/data';
import { getArticlePath } from '@/lib/article-routing';
import { getArticles } from '@/lib/public-data';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 300;

const staticPaths = [
  '/',
  '/blog',
  '/areas',
  '/topics',
  '/site-map',
  '/market-data',
  '/resources',
  '/things-to-do',
  '/housing-search',
  '/directory',
  '/directory/list-your-business',
  '/buy',
  '/rent',
  '/rent/find-a-home',
  '/sell',
  '/sell/your-home',
  '/sell/investment-property',
  '/invest',
  '/invest/deploy-capital',
  '/about',
  '/newsroom',
  '/editorial-standards',
  '/corrections',
  '/advertise',
  '/join',
  '/subscribe',
  '/contact',
  '/privacy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticles();
  return [
    ...staticPaths.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: path === '/' || path === '/blog' ? 'daily' as const : 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...areas.map((area) => ({
      url: absoluteUrl(`/areas/${area.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...topics.map((topic) => ({
      url: absoluteUrl(`/topics/${topic.slug}`),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(getArticlePath(article)),
      lastModified: article.updated_at || article.created_at,
      changeFrequency: 'monthly' as const,
      priority: article.featured ? 0.9 : 0.7,
      images: article.image_url ? [article.image_url] : undefined,
    })),
  ];
}
