import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAreaBySlug } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { getArticles, DbArticle } from "@/lib/public-data";
import { formatPeriod, getCanonicalMarketData, selectAreaMetrics, type MarketMetric } from "@/lib/market-data";
import { getArticlePath } from "@/lib/article-routing";
import { CoverImage } from "@/components/cren/cover-image";
import { GuideCard, RepresentativeImageNote } from "@/components/guide-card";
import { composeDescription, composeTitle } from "@/lib/page-metadata";
import { absoluteUrl } from "@/lib/site";
import { getAreaGuide, OFFICIAL_ACTIVITY_SOURCES } from "@/lib/area-guides";
import { AreaFollowForm } from "@/components/area-follow-form";
import {
  getAreaFollowPromise,
  getAreaRealityCheck,
  getAreaReleasePolicy,
  getProofCohortContentPackage,
} from "@/lib/consumer-insights";
import {
  buildAreaMarketComparison,
  getFlagshipArea,
  getFlagshipRealityCheck,
  resolveFaqSource,
  resolveReportingRecord,
  type FlagshipRealityCheck,
} from "@/lib/flagship-areas";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) return {};
  const releasePolicy = getAreaReleasePolicy(area);
  const realityCheck: FlagshipRealityCheck | null = getAreaRealityCheck(area) ?? getFlagshipRealityCheck(area.slug);
  return {
    title: realityCheck
      ? composeTitle([`${area.name} Area Reality Check`, `${area.name} Reality Check`])
      : composeTitle([
          `${area.name} Housing & Local Living Guide`,
          `${area.name} Housing Guide`,
          `${area.name} Guide`,
        ]),
    // composeDescription keeps the hub blurb inside the 165-character
    // convention: the old `${blurb} ${one fixed sentence}` template ran to 199
    // characters on the areas with a long blurb, so Google truncated the
    // sentence mid-thought on five hubs.
    description: realityCheck
      ? composeDescription(realityCheck.shortAnswer, [
          `Sourced ${area.name} reporting on housing, rent, development, and local decisions.`,
          `Sourced ${area.name} housing and development reporting.`,
        ])
      : composeDescription(area.description, [
          `Follow housing, rent, development, schools, restaurants, events, and local decisions affecting ${area.name}.`,
          `Follow ${area.name} housing, rent, development, schools, and the local decisions behind them.`,
          `Follow ${area.name} housing, rent, and development as we publish it.`,
          `Follow ${area.name} housing and local news.`,
        ]),
    alternates: { canonical: absoluteUrl(`/areas/${area.slug}`) },
    robots: { index: releasePolicy.indexable, follow: true },
  };
}

function ArticleCard({ article }: { article: DbArticle }) {
  return (
    <Link href={getArticlePath(article)} className="block no-underline group">
      <div className="cren-surface overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]">
        {article.image_url && (
          <div className="relative aspect-[16/9] overflow-hidden">
            <CoverImage src={article.image_url} alt={article.title} thumbnail />
          </div>
        )}
        <div className="p-5">
          <span className="mb-2 inline-block rounded-full bg-[color:var(--green)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">
            {article.category}
          </span>
          <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
            {article.title}
          </h3>
          {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{article.excerpt}</p>}
          <div className="mt-3 text-xs text-[color:var(--text-muted)]">
            {article.author} · {article.date} · {article.read_time}
          </div>
        </div>
      </div>
    </Link>
  );
}

const funnelCardClass = "cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-4";

/**
 * One cell of the flagship comparison table. A missing metric is stated as a
 * gap, never filled in from a neighbouring geography.
 */
function MarketComparisonCell({ metric }: { metric: MarketMetric | null }) {
  if (!metric) {
    return <span className="text-[color:var(--text-muted)]">Not published</span>;
  }
  return (
    <span className="inline-block">
      <span className="font-[family-name:var(--mono)] font-semibold text-[color:var(--text-hero)]">{metric.value}</span>
      <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">{formatPeriod(metric)}</span>
    </span>
  );
}

export default async function AreaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();
  const guide = getAreaGuide(area);
  // Flagship hubs (owner plan 2026-09-04, P1 item 8) carry a reality check of
  // their own when they are not part of the original proof cohort.
  const flagship = getFlagshipArea(area.slug);
  const realityCheck: FlagshipRealityCheck | null = getAreaRealityCheck(area) ?? flagship?.realityCheck ?? null;
  const contentPackage = getProofCohortContentPackage(area);
  const followPromise = realityCheck?.followPromise ?? getAreaFollowPromise(area);

  let local: DbArticle[] = [];
  let metro: DbArticle[] = [];
  let allArticles: DbArticle[] = [];
  // Area metrics come from the canonical market set, so an area hub and the
  // metro dashboard can never disagree about the same measure.
  let areaMetrics: MarketMetric[] = [];
  let comparison: ReturnType<typeof buildAreaMarketComparison> | null = null;

  try {
    const [articles, marketSet] = await Promise.all([getArticles(), getCanonicalMarketData()]);
    allArticles = articles;
    local = articles.filter((a) => a.area_slug === area.slug && area.slug !== "columbus-citywide");
    metro = articles.filter((a) => a.area_slug === "columbus-citywide").slice(0, 4);
    areaMetrics = selectAreaMetrics(marketSet, area.slug);
    if (flagship) {
      comparison = buildAreaMarketComparison(
        marketSet,
        area.slug,
        flagship.comparisonSlugs,
        (comparedSlug) => getAreaBySlug(comparedSlug)?.name ?? comparedSlug,
      );
    }
  } catch {
    // Continue with empty data
  }

  // Every cited story is resolved against the live article set, so a hub can
  // never point at coverage that was unpublished, renamed, or never existed.
  const reportingRecord = flagship ? resolveReportingRecord(flagship.reportingRecord, allArticles) : [];
  const faqs = (flagship?.faqs ?? []).map((faq) => ({ faq, source: resolveFaqSource(faq, allArticles) }));
  const faqStructuredData =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: `${area.name} housing questions`,
          mainEntity: faqs.map(({ faq }) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  // For the citywide hub itself, "local" is the full metro feed.
  if (area.slug === "columbus-citywide") {
    local = allArticles.filter((a) => a.area_slug === "columbus-citywide");
    metro = [];
  }

  const reportedHeroImage = local.find((a) => a.image_url)?.image_url ?? null;
  const coverageShelves = [
    {
      title: 'Housing, rents & the market',
      articles: local.filter((article) => !['development', 'local-politics', 'events-lifestyle'].includes(article.topic_slug ?? '')),
    },
    {
      title: 'Development & local decisions',
      articles: local.filter((article) => ['development', 'local-politics'].includes(article.topic_slug ?? '')),
    },
    {
      title: 'Restaurants, events & local life',
      articles: local.filter((article) => article.topic_slug === 'events-lifestyle'),
    },
  ].filter((shelf) => shelf.articles.length > 0);

  return (
    <CrenPage>
      {/* One attribute makes every funnel CTA click anywhere on this hub carry
          the area, because FunnelTracker reads the nearest data-area-slug. */}
      <div className="cren-stack-lg" data-area-slug={area.slug}>
        {faqStructuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
          />
        )}
        {/* Header */}
        <div className="cren-surface overflow-hidden">
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-[color:var(--green-pale)]">
            {reportedHeroImage ? (
              <CoverImage src={reportedHeroImage} alt={`${area.name} local coverage`} sizes="(max-width: 1024px) 100vw, 900px" priority />
            ) : (
              <Image src={guide.representativeImage} alt={guide.representativeImageAlt} fill sizes="(max-width: 1024px) 100vw, 900px" priority className="object-cover" />
            )}
          </div>
          <div className="p-6 md:p-8">
            <div className="section-eyebrow">Neighborhood Hub</div>
            <h1 className="cren-heading-xl">{area.name}</h1>
            <p className="cren-body mt-2 max-w-2xl">{area.description}</p>
            {area.multiCountyNote && (
              <p className="cren-body mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--green-pale)] px-3 py-2 text-sm text-[color:var(--text-body)]">
                {area.multiCountyNote}
              </p>
            )}
            {!reportedHeroImage && <RepresentativeImageNote />}
          </div>
        </div>

        {realityCheck && (
          <section data-section-id="area-reality-check">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="cren-surface p-6 md:p-8">
                <div className="section-eyebrow">{realityCheck.label} Area Reality Check</div>
                <h2 className="cren-heading-lg">{realityCheck.primaryQuestion}</h2>
                <p className="cren-body mt-3">{realityCheck.shortAnswer}</p>
                <p className="cren-body mt-4 text-sm">{realityCheck.budgetReality}</p>
                <div className="cren-btn-row mt-5">
                  <Link href={realityCheck.primaryCta.href} className="cren-btn cren-btn-primary">{realityCheck.primaryCta.label}</Link>
                  <Link href={realityCheck.secondaryCta.href} className="cren-btn cren-btn-outline">{realityCheck.secondaryCta.label}</Link>
                </div>
              </div>
              <div className="cren-surface p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">Verify first</h3>
                <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-secondary)]">
                  {realityCheck.whatToVerify.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">Best for</h3>
                <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-secondary)]">
                  {realityCheck.bestFor.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">Not best for</h3>
                <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-secondary)]">
                  {realityCheck.notBestFor.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">Local-life stack</h3>
                <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-secondary)]">
                  {realityCheck.localLifeStack.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">What changed</h3>
                <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-secondary)]">
                  {realityCheck.whatChanged.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Nearby substitutes to compare</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {realityCheck.nearbySubstitutes.map((substitute) => (
                  <Link key={substitute.href} href={substitute.href} className="cren-action-chip">
                    {substitute.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {reportingRecord.length > 0 && (
          <section className="cren-surface p-6 md:p-8" data-section-id="area-reporting-record">
            <div className="mb-5 max-w-3xl">
              <div className="section-eyebrow">What we reported</div>
              <h2 className="cren-heading-lg">CREN reporting on {area.name}</h2>
              <p className="cren-body mt-2 text-sm">
                Each line states what one published story established, no more strongly than the story did. Open a story to
                read the records and sources behind it.
              </p>
            </div>
            <ol className="grid gap-3">
              {reportingRecord.map(({ article, whatItShows }) => (
                <li key={article.id} className="cren-soft p-4">
                  <p className="text-sm text-[color:var(--text-body)]">{whatItShows}</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link href={getArticlePath(article)} className="cren-text-link text-sm font-semibold">
                      {article.title}
                    </Link>
                    <span className="text-xs text-[color:var(--text-muted)]">{article.date}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {contentPackage && (
          <section className="cren-surface p-6 md:p-8" data-section-id="area-content-package">
            <div className="mb-5 max-w-3xl">
              <div className="section-eyebrow">Content package</div>
              <h2 className="cren-heading-lg">{contentPackage.title}</h2>
              <p className="cren-body mt-2 text-sm">{contentPackage.primaryJob}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {contentPackage.leadPieces.map((piece) => (
                <Link key={piece.title} href={piece.href} className="cren-soft cren-card-link p-5 no-underline">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">{piece.format}</span>
                  <h3 className="mt-2 font-semibold text-[color:var(--text-hero)]">{piece.title}</h3>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{piece.audience}</p>
                  <span className="cren-text-link mt-3 inline-block text-sm">{piece.cta}</span>
                </Link>
              ))}
            </div>
            <div className="cren-soft mt-5 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-hero)]">Evidence requirements</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {contentPackage.evidenceRequirements.map((requirement) => (
                  <span key={requirement} className="cren-action-chip">{requirement}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        <AreaFollowForm areaName={area.name} areaSlug={area.slug} followPromise={followPromise} source={`${area.slug}-area-hub`} />

        {/* Daily life and things to do */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <div className="section-eyebrow">Live here, not just search here</div>
              <h2 className="cren-heading-lg">Daytime fun, kids, parks, food and entertainment</h2>
              <p className="cren-body mt-2 text-sm">{guide.dailyLifeAnswer}</p>
            </div>
            <Link href="/things-to-do" className="cren-action-chip">Open the Columbus things-to-do guide</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {guide.discoveryCards.map((card) => <GuideCard key={card.title} card={card} />)}
          </div>
          <div className="cren-soft mt-4 p-4">
            <p className="text-sm font-semibold text-[color:var(--text-hero)]">Prefer official calendars?</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {OFFICIAL_ACTIVITY_SOURCES.map((source) => (
                <a key={source.title} href={source.href} target="_blank" rel="noopener noreferrer" className="cren-text-link text-sm">
                  {source.title} ↗
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Source-aware Market Data */}
        {areaMetrics.length > 0 ? (
          <div className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg mb-2">{area.name} housing and rent snapshot</h2>
            <p className="cren-body mb-5 text-sm">Each measure keeps its source, geography, property type, and observation period attached.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {areaMetrics.map((metric) => (
                <div key={metric.id} className="cren-metric-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{metric.label}</p>
                  <p className="mt-1 font-[family-name:var(--mono)] text-xl font-semibold text-[color:var(--text-hero)]">{metric.value}</p>
                  <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                    {metric.propertyType.replaceAll('-', ' ')} · {formatPeriod(metric)}
                  </p>
                  {metric.source.url && metric.source.name ? (
                    <a href={metric.source.url} target="_blank" rel="noopener noreferrer" className="cren-text-link mt-2 inline-block text-xs">
                      Source: {metric.source.name}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-[color:var(--text-muted)]">Source not attached — treat as unverified</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg">{area.name} housing and rent snapshot</h2>
            <p className="cren-body mt-2 text-sm">
              A source-complete area series is being assembled. CREN will publish figures here only when the geography, period,
              property type, observation date, and source link are attached.
            </p>
            <Link href="/market-data" className="cren-text-link mt-3 inline-block text-sm">View the transitional metro dashboard</Link>
          </div>
        )}

        {/* Flagship comparison: this area against its substitutes and the metro
            baseline, using only what the canonical market set already carries. */}
        {comparison && comparison.hasAnyValue && (
          <section className="cren-surface p-6 md:p-8" data-section-id="area-market-comparison">
            <div className="mb-5 max-w-3xl">
              <div className="section-eyebrow">Compare before you commit</div>
              <h2 className="cren-heading-lg">{area.name} against comparable areas</h2>
              <p className="cren-body mt-2 text-sm">
                Same measure, same source, same period, so the gap between two areas is measured rather than estimated.
                These are the areas a reader here usually weighs on price and housing type. Where no source publishes a
                series for an area, the cell stays empty.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th scope="col" className="py-2 pr-4 font-semibold text-[color:var(--text-hero)]">Area</th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-[color:var(--text-hero)]">Typical home value</th>
                    <th scope="col" className="py-2 font-semibold text-[color:var(--text-hero)]">Observed rent</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.slug} className="border-b border-[color:var(--border)] last:border-0">
                      <th scope="row" className="py-3 pr-4 font-normal">
                        {row.isSubject ? (
                          <span className="font-semibold text-[color:var(--text-hero)]">{row.label}</span>
                        ) : (
                          <Link href={`/areas/${row.slug}`} className="cren-text-link">{row.label}</Link>
                        )}
                        {row.isBaseline && (
                          <span className="ml-2 text-xs text-[color:var(--text-muted)]">metro baseline</span>
                        )}
                      </th>
                      <td className="py-3 pr-4">
                        <MarketComparisonCell metric={row.metrics["typical-home-value"]} />
                      </td>
                      <td className="py-3">
                        <MarketComparisonCell metric={row.metrics["observed-rent"]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cren-soft mt-4 p-4 text-xs text-[color:var(--text-muted)]">
              {comparison.sources.length > 0 && (
                <p>
                  Source:{" "}
                  {comparison.sources.map((source, index) => (
                    <span key={source.name}>
                      {index > 0 && ", "}
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="cren-text-link">
                          {source.name}
                        </a>
                      ) : (
                        source.name
                      )}
                    </span>
                  ))}
                  .
                </p>
              )}
              {comparison.missingSlugs.length > 0 && (
                <p className="mt-2">
                  No published series exists for{" "}
                  {comparison.missingSlugs.map((missing) => getAreaBySlug(missing)?.name ?? missing).join(", ")}. CREN
                  leaves those cells empty rather than substituting a figure from a different geography.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Housing search and listing actions */}
        <section data-section-id="area-housing-actions">
          <div className="mb-5 max-w-3xl">
            <div className="section-eyebrow">Housing actions</div>
            <h2 className="cren-heading-lg">Search, rent, buy, sell or list in {area.name}</h2>
            <p className="cren-body mt-2 text-sm">
              CREN provides local context and a portal checklist, not a claim that one listing site has the complete market. Compare sources and verify current status directly.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {guide.housingCards.map((card) => <GuideCard key={card.title} card={card} />)}
          </div>
        </section>

        {/* Service and local business directory */}
        <section>
          <div className="mb-5 max-w-3xl">
            <div className="section-eyebrow">Local directory</div>
            <h2 className="cren-heading-lg">Services and businesses serving {area.name}</h2>
            <p className="cren-body mt-2 text-sm">
              Find practical home services and local-living categories, or submit a business for review. Directory placement is separate from newsroom coverage.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {guide.serviceCards.map((card) => <GuideCard key={card.title} card={card} />)}
          </div>
        </section>

        {/* Local coverage */}
        {coverageShelves.length > 0 ? (
          <section>
            <h2 className="cren-heading-lg mb-4">{area.slug === "columbus-citywide" ? "Metro coverage" : `${area.name} coverage`}</h2>
            <div className="space-y-8">
              {coverageShelves.map((shelf) => (
                <div key={shelf.title}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{shelf.title}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {shelf.articles.map((article) => <ArticleCard key={article.id} article={article} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="cren-surface p-6 text-center">
            <p className="cren-body text-[color:var(--text-muted)]">
              We haven&apos;t published a {area.name}-specific story yet.{" "}
              <Link href="/subscribe" className="cren-text-link">Subscribe</Link> and we&apos;ll tell you when we do. Metro coverage is below.
            </p>
          </div>
        )}

        {/* Metro context (only on non-citywide hubs) */}
        {area.slug !== "columbus-citywide" && metro.length > 0 && (
          <section>
            <h2 className="cren-heading-lg mb-4">Across the Columbus metro</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {metro.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}

        {faqs.length > 0 && (
          <section className="cren-surface p-6 md:p-8" data-section-id="area-faq">
            <div className="mb-4 max-w-3xl">
              <div className="section-eyebrow">Straight answers</div>
              <h2 className="cren-heading-lg">Questions people ask about {area.name}</h2>
            </div>
            <div className="grid gap-3">
              {faqs.map(({ faq, source }) => (
                <details key={faq.question} className="cren-soft p-4">
                  <summary className="cursor-pointer font-semibold text-[color:var(--text-hero)]">{faq.question}</summary>
                  <p className="cren-body mt-2 text-sm">{faq.answer}</p>
                  {source && (
                    <Link href={getArticlePath(source)} className="cren-text-link mt-2 inline-block text-xs">
                      Our reporting: {source.title}
                    </Link>
                  )}
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Verify local information</h2>
          <p className="cren-body mt-2 text-sm">Use originating records before making a housing or school decision. Boundaries, assessments, schedules, and project status can change.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a href="https://auditor.franklincountyohio.gov/Auditor/Online-Tools" target="_blank" rel="noopener noreferrer" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">Property records</h3>
              <p className="cren-body mt-1 text-sm">Franklin County Auditor tools</p>
            </a>
            <a href="https://reportcard.education.ohio.gov/" target="_blank" rel="noopener noreferrer" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">School report cards</h3>
              <p className="cren-body mt-1 text-sm">Ohio district and building data</p>
            </a>
            <a href="https://columbus.legistar.com/Legislation.aspx" target="_blank" rel="noopener noreferrer" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">City legislation</h3>
              <p className="cren-body mt-1 text-sm">Columbus ordinances and records</p>
            </a>
            <a href="https://www.experiencecolumbus.com/events/?sort=date&view=list" target="_blank" rel="noopener noreferrer" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">Events calendar</h3>
              <p className="cren-body mt-1 text-sm">Current Columbus-area events</p>
            </a>
          </div>
        </section>

        <div className="flex gap-4">
          <Link href="/areas" className="cren-text-link text-sm font-semibold">All neighborhoods</Link>
          <Link href="/market-data" className="cren-text-link text-sm font-semibold">Full market data</Link>
        </div>
      </div>
    </CrenPage>
  );
}
