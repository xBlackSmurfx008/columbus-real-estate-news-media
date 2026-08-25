import { getArticlePath } from '@/lib/article-routing';
import { getArticles } from '@/lib/public-data';
import { absoluteUrl, escapeXml, SITE_NAME } from '@/lib/site';

export const revalidate = 300;

export async function GET() {
  const cutoff = Date.now() - (2 * 24 * 60 * 60 * 1000);
  const articles = (await getArticles()).filter((article) => {
    const published = new Date(article.created_at).getTime();
    return Number.isFinite(published) && published >= cutoff;
  });
  const urls = articles.map((article) => `
  <url>
    <loc>${escapeXml(absoluteUrl(getArticlePath(article)))}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(new Date(article.created_at).toISOString())}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
