import type { Metadata } from 'next';
import Link from 'next/link';
import { CrenPage } from '@/components/cren/cren-page';
import { GlobalSearchCombobox, type SearchSuggestion } from '@/components/global-search-combobox';
import { ZeroResultRecovery } from '@/components/zero-result-recovery';
import { getArticlePath } from '@/lib/article-routing';
import { areas, topics } from '@/lib/data';
import { getPublicData } from '@/lib/public-data';
import {
  RESOURCE_SEARCH_SUGGESTIONS,
  areaSearchText,
  articleSearchText,
  normalizeSearchText,
  searchTextMatches,
  topicSearchText,
} from '@/lib/search-index';

export const metadata: Metadata = {
  title: 'Search Columbus Areas, Stories & Resources',
  description: 'Search CREN coverage by Columbus neighborhood, suburb, topic, market question, restaurant, event, or story.',
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? '';
  const normalized = normalizeSearchText(query);
  const data = await getPublicData();

  const suggestions: SearchSuggestion[] = [
    ...areas.map((area) => ({
      id: `area-${area.slug}`,
      label: area.name,
      href: `/areas/${area.slug}`,
      type: 'area' as const,
      description: area.description,
      searchText: areaSearchText(area),
    })),
    ...topics.map((topic) => ({
      id: `topic-${topic.slug}`,
      label: topic.name,
      href: `/topics/${topic.slug}`,
      type: 'topic' as const,
      description: topic.description,
      searchText: topicSearchText(topic),
    })),
    ...RESOURCE_SEARCH_SUGGESTIONS,
    ...data.articles.map((article) => ({
      id: `article-${article.id}`,
      label: article.title,
      href: getArticlePath(article),
      type: 'article' as const,
      description: article.excerpt ?? undefined,
      searchText: articleSearchText(article),
    })),
  ];

  const matchingAreas = normalized
    ? areas.filter((area) => searchTextMatches(areaSearchText(area), normalized)).slice(0, 12)
    : [];
  const matchingTopics = normalized
    ? topics.filter((topic) => searchTextMatches(topicSearchText(topic), normalized)).slice(0, 8)
    : [];
  const matchingResources = normalized
    ? RESOURCE_SEARCH_SUGGESTIONS.filter((resource) => searchTextMatches(resource.searchText, normalized)).slice(0, 8)
    : [];
  const matchingArticles = normalized
    ? data.articles.filter((article) => searchTextMatches(articleSearchText(article), normalized)).slice(0, 24)
    : [];
  const hasResults = matchingAreas.length + matchingTopics.length + matchingResources.length + matchingArticles.length > 0;

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface p-6 md:p-8">
          <p className="section-eyebrow">Search CREN</p>
          <h1 className="cren-heading-xl">Find a place, story, or local answer</h1>
          <p className="cren-body mt-2 max-w-3xl">
            Search neighborhoods, suburbs, housing questions, development, politics, restaurants, events, and community resources.
          </p>
          <div className="mt-6 max-w-4xl">
            <GlobalSearchCombobox
              id="site-search-input"
              placeholder="Try German Village, average rent, zoning, or festivals"
              suggestions={suggestions}
              submitLabel="Search CREN"
            />
          </div>
        </section>

        {!query ? (
          <section className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg">Popular ways to explore</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/areas" className="cren-action-chip">Explore areas</Link>
              <Link href="/market-data" className="cren-action-chip">Market and housing</Link>
              <Link href="/things-to-do" className="cren-action-chip">Things to do</Link>
              <Link href="/topics/local-politics" className="cren-action-chip">Local politics</Link>
              <Link href="/resources" className="cren-action-chip">Practical resources</Link>
            </div>
          </section>
        ) : (
          <div className="cren-stack">
            <div>
              <p className="section-eyebrow">Search results</p>
              <h2 className="cren-heading-lg">Results for “{query}”</h2>
            </div>

            {matchingAreas.length > 0 && (
              <section>
                <h3 className="cren-heading-md">Areas</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {matchingAreas.map((area) => (
                    <Link key={area.slug} href={`/areas/${area.slug}`} className="cren-surface block p-5 no-underline">
                      <span className="font-semibold text-[color:var(--text-hero)]">{area.name}</span>
                      <span className="mt-1 block text-sm text-[color:var(--text-secondary)]">{area.description}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {matchingTopics.length > 0 && (
              <section>
                <h3 className="cren-heading-md">Topics</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {matchingTopics.map((topic) => (
                    <Link key={topic.slug} href={`/topics/${topic.slug}`} className="cren-surface block p-5 no-underline">
                      <span className="font-semibold text-[color:var(--text-hero)]">{topic.name}</span>
                      <span className="mt-1 block text-sm text-[color:var(--text-secondary)]">{topic.description}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {matchingResources.length > 0 && (
              <section>
                <h3 className="cren-heading-md">Resources and tools</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {matchingResources.map((resource) => (
                    <Link key={resource.id} href={resource.href} className="cren-surface block p-5 no-underline">
                      <span className="font-semibold text-[color:var(--text-hero)]">{resource.label}</span>
                      {resource.description && (
                        <span className="mt-1 block text-sm text-[color:var(--text-secondary)]">{resource.description}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {matchingArticles.length > 0 && (
              <section>
                <h3 className="cren-heading-md">Stories and guides</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {matchingArticles.map((article) => (
                    <Link key={article.id} href={getArticlePath(article)} className="cren-surface block p-5 no-underline">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">
                        {article.category}
                      </span>
                      <span className="mt-2 block font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">
                        {article.title}
                      </span>
                      {article.excerpt && (
                        <span className="mt-2 line-clamp-2 block text-sm text-[color:var(--text-secondary)]">{article.excerpt}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {hasResults && (
              <section className="cren-soft p-5">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h3 className="font-semibold text-[color:var(--text-hero)]">Follow this search</h3>
                    <p className="cren-body mt-1 text-sm">Save a preference so CREN can prioritize updates around this question or place.</p>
                  </div>
                  <Link href={`/subscribe?source=search-results&topic=${encodeURIComponent(query)}`} className="cren-btn cren-btn-outline">
                    Follow updates
                  </Link>
                </div>
              </section>
            )}

            {!hasResults && <ZeroResultRecovery query={query} />}
          </div>
        )}
      </div>
    </CrenPage>
  );
}
