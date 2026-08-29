import type { MetadataRoute } from 'next';
import { areas, topics } from '@/lib/data';
import { getArticlePath } from '@/lib/article-routing';
import { getAreaReleasePolicy } from '@/lib/consumer-insights';
import { POLICY_LIBRARY_ORDER, policyPath } from '@/lib/policy-pages';
import { getArticles } from '@/lib/public-data';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 300;

const staticPaths = [
  '/',
  '/blog',
  '/areas',
  '/topics',
  '/site-map',
  '/saved',
  '/profile',
  '/market-data',
  '/resources',
  '/things-to-do',
  '/housing-search',
  '/directory',
  '/directory/list-your-business',
  '/directory/sponsor-rules',
  '/buy',
  '/buy/price-band-reality',
  '/rent',
  '/rent/before-you-sign',
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
  '/policies',
  ...POLICY_LIBRARY_ORDER.map(policyPath),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticles();
  return [
    ...staticPaths.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: path === '/' || path === '/blog' ? 'daily' as const : 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...areas
      .map((area) => ({ area, policy: getAreaReleasePolicy(area) }))
      .filter(({ policy }) => policy.indexable)
      .map(({ area, policy }) => ({
        url: absoluteUrl(`/areas/${area.slug}`),
        changeFrequency: policy.changeFrequency,
        priority: policy.sitemapPriority,
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
