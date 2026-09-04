import type { Metadata } from 'next';
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { ArticleCard } from "@/components/cren/article-card";
import { getArticles, DbArticle } from "@/lib/public-data";
import { toArticleCardData } from "@/lib/article-card";
import { pageMetadata } from "@/lib/page-metadata";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  path: '/blog',
  title: 'Columbus Real Estate Reporting & Analysis',
  description:
    'Latest sourced reporting on Columbus housing, rent, development, local policy, restaurants, events, and neighborhood life across Columbus and Central Ohio.',
});

export default async function BlogPage() {
  let articles: DbArticle[] = [];
  try {
    articles = await getArticles();
  } catch {
    articles = [];
  }

  // Mapped to the ten fields a card actually renders before it crosses the
  // server/client boundary — see lib/article-card.ts for why that matters to
  // the size of this page.
  const cards = articles.map(toArticleCardData);
  const featuredArticles = cards.filter((a) => a.featured);
  const otherArticles = cards.filter((a) => !a.featured);

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Live Coverage</div>
          <h1 className="cren-heading-xl">Market News &amp; Analysis</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Market updates, neighborhood analysis, and data-driven guidance for renters, buyers, sellers, and investors across
            Columbus and Central Ohio.
          </p>
          <div className="mt-4 flex gap-4">
            <Link href="/areas" className="cren-text-link inline-block text-sm">
              Browse neighborhoods
            </Link>
            <Link href="/market-data" className="cren-text-link inline-block text-sm">
              View market data
            </Link>
          </div>
        </div>

        {featuredArticles.length > 0 && (
          <section className="space-y-4">
            <h2 className="cren-heading-lg">Featured</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {featuredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} featured />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="cren-heading-lg">Latest Coverage</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {otherArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {articles.length === 0 && (
            <div className="cren-surface p-8 text-center">
              <p className="cren-body text-[color:var(--text-muted)]">
                Our article feed is temporarily unavailable. Check back soon.
              </p>
            </div>
          )}
        </section>
      </div>
    </CrenPage>
  );
}
