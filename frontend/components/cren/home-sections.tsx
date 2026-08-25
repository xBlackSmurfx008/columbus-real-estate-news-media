import Link from 'next/link';
import { CoverImage } from '@/components/cren/cover-image';
import { HomeNewsletterForm } from '@/components/cren/home-newsletter-form';
import { GlobalSearchCombobox, type SearchSuggestion } from '@/components/global-search-combobox';
import { getArticlePath } from '@/lib/article-routing';
import { areas, topics } from '@/lib/data';
import { isLocalLivingArticle, prepareHomeArticles } from '@/lib/home-feed';
import type { DbAd, DbArticle, DbMarketSnapshot, DbNeighborhood } from '@/lib/public-data';

const categoryTagClass: Record<string, string> = {
  'Market Analysis': 'tag-market',
  Development: 'tag-development',
  Neighborhoods: 'tag-neighborhoods',
  'Economic Impact': 'tag-invest',
  'Rental Market': 'tag-rent',
  Commercial: 'tag-market',
};

const bentoBgs = ['bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-5', 'bg-6'];

interface HomeSectionsProps {
  articles?: DbArticle[];
  marketSnapshot?: DbMarketSnapshot[];
  neighborhoods?: DbNeighborhood[];
  ads?: DbAd[];
}

function formatDate() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}

function BentoImage({ article, bg, priority = false }: { article: DbArticle; bg: string; priority?: boolean }) {
  return (
    <div className="bento-img">
      {article.image_url ? (
        <CoverImage
          src={article.image_url}
          alt={article.image_alt || article.title}
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={priority}
        />
      ) : (
        <div className={`bento-img-bg ${bg}`} aria-hidden="true" />
      )}
    </div>
  );
}

function ArticleCard({ article, index, className = 'bento-sm' }: { article: DbArticle; index: number; className?: string }) {
  return (
    <Link href={getArticlePath(article)} className={`bento-card ${className} no-underline`}>
      <BentoImage article={article} bg={bentoBgs[index % bentoBgs.length]!} priority={className === 'bento-lg'} />
      <div className="bento-body">
        <span className={`bento-tag ${categoryTagClass[article.category] ?? 'tag-market'}`}>{article.category}</span>
        <div className="bento-title">{article.title}</div>
        {className !== 'bento-sm' && article.excerpt && <div className="bento-excerpt">{article.excerpt}</div>}
        <div className="bento-footer">
          <span>{article.date}</span>
          <span>·</span>
          <span>{article.read_time}</span>
        </div>
      </div>
    </Link>
  );
}

export function HomeSections({ articles = [], marketSnapshot = [], neighborhoods = [], ads = [] }: HomeSectionsProps) {
  const preparedArticles = prepareHomeArticles(articles);
  const heroArticle = preparedArticles[0] ?? null;
  const latestArticles = preparedArticles.slice(1, 7);
  const usedIds = new Set([heroArticle?.id, ...latestArticles.map((article) => article.id)].filter(Boolean));
  const localCandidates = preparedArticles.filter((article) => !usedIds.has(article.id));
  const localLiving = localCandidates.filter(isLocalLivingArticle).slice(0, 4);
  const marketPulse = marketSnapshot.slice(0, 4);
  const nativeAd = ads.find((ad) => ad.type === 'native');
  const featuredNeighborhoods = neighborhoods.slice(0, 6).map((neighborhood) => ({
    ...neighborhood,
    slug: neighborhood.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  }));
  const searchSuggestions: SearchSuggestion[] = [
    ...areas.map((area) => ({
      id: `area-${area.slug}`,
      label: area.name,
      href: `/areas/${area.slug}`,
      type: 'area' as const,
    })),
    ...topics.map((topic) => ({
      id: `topic-${topic.slug}`,
      label: topic.name,
      href: `/topics/${topic.slug}`,
      type: 'topic' as const,
    })),
    ...preparedArticles.map((article) => ({
      id: `article-${article.id}`,
      label: article.title,
      href: getArticlePath(article),
      type: 'article' as const,
    })),
  ];

  return (
    <>
      <section className="decision-hero">
        <div className="cren-container-wide">
          <div className="decision-hero-grid">
            <div className="decision-hero-content">
              <div className="hero-v5-eyebrow">
                <span className="hero-v5-dot" aria-hidden="true" />
                Updated {formatDate()} · Columbus &amp; Central Ohio
              </div>
              <h1 className="decision-hero-title">Understand where Columbus is going—and what it means for where you live.</h1>
              <p className="decision-hero-copy">
                Explore housing costs, neighborhood change, local decisions, restaurants, events, and practical community resources.
              </p>

              <div className="decision-intents" aria-label="What are you planning?">
                <span className="decision-intents-label">What are you planning?</span>
                <div className="decision-intents-row">
                  <Link href="/rent" className="decision-intent">Rent</Link>
                  <Link href="/buy" className="decision-intent">Buy</Link>
                  <Link href="/sell" className="decision-intent">Sell</Link>
                  <Link href="/invest" className="decision-intent">Own or invest</Link>
                  <Link href="/areas" className="decision-intent">Just explore</Link>
                </div>
              </div>

              <div className="decision-search">
                <GlobalSearchCombobox
                  id="home-area-search"
                  placeholder="Search an area, ZIP, topic, restaurant, event, or story"
                  suggestions={searchSuggestions}
                  submitLabel="Search CREN"
                />
                <p>Start with German Village, Dublin, average rent, zoning, or festivals.</p>
              </div>
            </div>

            {heroArticle ? (
              <Link href={getArticlePath(heroArticle)} className="decision-lead no-underline" aria-label={heroArticle.title}>
                <div className="decision-lead-image">
                  {heroArticle.image_url ? (
                    <CoverImage
                      src={heroArticle.image_url}
                      alt={heroArticle.image_alt || heroArticle.title}
                      sizes="(max-width: 900px) 100vw, 44vw"
                      priority
                    />
                  ) : (
                    <div className="decision-lead-fallback" aria-hidden="true">
                      <span>CREN</span>
                      <strong>Columbus market brief</strong>
                    </div>
                  )}
                </div>
                <div className="decision-lead-body">
                  <span className="bento-tag tag-market">Today’s lead · {heroArticle.category}</span>
                  <h2>{heroArticle.title}</h2>
                  {heroArticle.excerpt && <p>{heroArticle.excerpt}</p>}
                  <span className="decision-lead-link">Read the story →</span>
                </div>
              </Link>
            ) : (
              <div className="decision-lead decision-lead-empty">
                <div className="decision-lead-body">
                  <span className="bento-tag tag-market">Coverage status</span>
                  <h2>The latest reporting feed is reconnecting.</h2>
                  <p>Area hubs, market data, and practical resources remain available.</p>
                  <Link href="/areas" className="cren-text-link">Explore Columbus areas</Link>
                </div>
              </div>
            )}
          </div>

          <div className="market-brief" aria-label="Current Columbus housing snapshot">
            <div className="market-brief-heading">
              <span>Housing snapshot</span>
              <small>Verify geography and period in the full report</small>
            </div>
            <div className="market-brief-stats">
              {marketPulse.length > 0 ? marketPulse.map((item) => (
                <div key={item.id} className="market-brief-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  {item.change && <small>{item.change}</small>}
                </div>
              )) : (
                <p>Latest verified snapshot temporarily unavailable.</p>
              )}
            </div>
            <Link href="/market-data" className="market-brief-link no-underline">See sources and data →</Link>
          </div>
        </div>
      </section>

      <section className="home-section-tight">
        <div className="cren-container-wide">
          <div className="home-section-heading">
            <div>
              <p className="section-eyebrow">What’s new</p>
              <h2 className="section-heading">Today in <em>Columbus</em></h2>
              <p className="section-desc">Housing, community change, and useful local reporting—without an endless article wall.</p>
            </div>
            <Link href="/blog" className="cren-text-link">See all reporting →</Link>
          </div>

          {latestArticles.length > 0 ? (
            <div className="bento home-story-grid">
              {latestArticles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={index}
                  className={index === 0 ? 'bento-lg' : index === 1 ? 'bento-md' : 'bento-sm'}
                />
              ))}
            </div>
          ) : (
            <div className="cren-surface p-6">The latest article feed is temporarily unavailable.</div>
          )}
        </div>
      </section>

      {localLiving.length > 0 && (
        <section className="local-living-section">
          <div className="cren-container-wide">
            <div className="home-section-heading">
              <div>
                <p className="section-eyebrow">Enjoy where you live</p>
                <h2 className="section-heading">Local living, made <em>useful</em></h2>
                <p className="section-desc">Restaurants, events, annual traditions, parks, and community life near home.</p>
              </div>
              <Link href="/topics/events-lifestyle" className="cren-text-link">Explore things to do →</Link>
            </div>
            <div className="local-living-grid">
              {localLiving.map((article, index) => (
                <ArticleCard key={article.id} article={article} index={index + 2} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="neighborhoods home-section-tight">
        <div className="cren-container-wide">
          <div className="home-section-heading">
            <div>
              <p className="section-eyebrow">Near you</p>
              <h2 className="section-heading">Follow an <em>area</em></h2>
              <p className="section-desc">See housing, development, restaurants, events, politics, and resources in one local briefing.</p>
            </div>
            <Link href="/areas" className="cren-text-link">Explore all areas →</Link>
          </div>
          <div className="hood-grid home-hood-grid">
            {featuredNeighborhoods.map((neighborhood) => (
              <Link key={neighborhood.id} href={`/areas/${neighborhood.slug}`} className="hood-card no-underline">
                <div className="hood-name">{neighborhood.name}</div>
                <div className="hood-type">{neighborhood.inventory} inventory</div>
                <div className="hood-stats">
                  <div><div className="hood-stat-val">{neighborhood.median}</div><div className="hood-stat-label">Typical value</div></div>
                  <div><div className="hood-stat-val">{neighborhood.rent}</div><div className="hood-stat-label">Avg rent (1BR)</div></div>
                  <div><div className="hood-stat-val">{neighborhood.yoy}</div><div className="hood-stat-label">Year over year</div></div>
                  <div><div className="hood-stat-val">{neighborhood.dom.replace(' days', '')}</div><div className="hood-stat-label">Avg days listed</div></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section-tight">
        <div className="cren-container-wide">
          <div className="community-question">
            <div>
              <p className="section-eyebrow">Your questions shape the reporting</p>
              <h2>What should CREN explain about your area?</h2>
              <p>Ask about a development, rent change, council decision, restaurant opening, public resource, or annual event.</p>
            </div>
            <Link href="/contact?subject=community-question" className="btn-primary no-underline">Ask CREN</Link>
          </div>
        </div>
      </section>

      {nativeAd && (
        <section className="home-sponsor-section">
          <div className="cren-container-wide">
            <div className="home-sponsor-card">
              <div>
                <span className="home-sponsor-label">Paid content from {nativeAd.brand_name || 'a CREN partner'}</span>
                <h2>{nativeAd.title}</h2>
                {nativeAd.text && <p>{nativeAd.text}</p>}
              </div>
              {nativeAd.cta_text && nativeAd.cta_url && (
                <a href={nativeAd.cta_url} className="cren-text-link">{nativeAd.cta_text} →</a>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="home-newsletter-section">
        <div className="cren-container-wide">
          <div className="newsletter-cta">
            <div className="nl-inner">
              <div>
                <div className="nl-heading">Follow the Columbus areas and topics you care about</div>
                <div className="nl-desc">Get useful housing, local-decision, restaurant, and event updates without a generic news dump.</div>
                <div className="nl-proof">Choose your interests. Change them whenever you want.</div>
              </div>
              <div>
                <HomeNewsletterForm />
                <div className="nl-checks">
                  <span className="nl-check">Free</span>
                  <span className="nl-check">Reader-first</span>
                  <span className="nl-check">Unsubscribe anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
