import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAreaBySlug } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { getArticles, getAreaMarketObservations, DbArticle, DbMarketObservation } from "@/lib/public-data";
import { getArticlePath } from "@/lib/article-routing";
import { CoverImage } from "@/components/cren/cover-image";
import { GuideCard, RepresentativeImageNote } from "@/components/guide-card";
import { getAreaGuide, OFFICIAL_ACTIVITY_SOURCES } from "@/lib/area-guides";
import { AreaFollowForm } from "@/components/area-follow-form";
import {
  getAreaFollowPromise,
  getAreaRealityCheck,
  getAreaReleasePolicy,
  getProofCohortContentPackage,
} from "@/lib/consumer-insights";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) return {};
  const releasePolicy = getAreaReleasePolicy(area);
  const realityCheck = getAreaRealityCheck(area);
  return {
    title: realityCheck ? `${area.name} Area Reality Check` : `${area.name} Housing & Local Living Guide`,
    description: realityCheck
      ? realityCheck.shortAnswer
      : `${area.description} Follow housing, rent, development, schools, restaurants, events, and local decisions affecting ${area.name}.`,
    alternates: { canonical: `/areas/${area.slug}` },
    robots: { index: releasePolicy.indexable, follow: true },
  };
}

function ArticleCard({ article }: { article: DbArticle }) {
  return (
    <Link href={getArticlePath(article)} className="block no-underline group">
      <div className="cren-surface overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]">
        {article.image_url && (
          <div className="relative aspect-[16/9] overflow-hidden">
            <CoverImage src={article.image_url} alt={article.title} sizes="(max-width: 768px) 100vw, 50vw" />
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

export default async function AreaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();
  const guide = getAreaGuide(area);
  const realityCheck = getAreaRealityCheck(area);
  const contentPackage = getProofCohortContentPackage(area);
  const followPromise = getAreaFollowPromise(area);

  let local: DbArticle[] = [];
  let metro: DbArticle[] = [];
  let observations: DbMarketObservation[] = [];

  try {
    const [allArticles, areaObservations] = await Promise.all([getArticles(), getAreaMarketObservations(area.slug)]);
    local = allArticles.filter((a) => a.area_slug === area.slug && area.slug !== "columbus-citywide");
    metro = allArticles.filter((a) => a.area_slug === "columbus-citywide").slice(0, 4);
    observations = areaObservations;
  } catch {
    // Continue with empty data
  }

  // For the citywide hub itself, "local" is the full metro feed.
  if (area.slug === "columbus-citywide") {
    try {
      const all = await getArticles();
      local = all.filter((a) => a.area_slug === "columbus-citywide");
      metro = [];
    } catch {}
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
      <div className="cren-stack-lg">
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
        {observations.length > 0 ? (
          <div className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg mb-2">{area.name} housing and rent snapshot</h2>
            <p className="cren-body mb-5 text-sm">Each measure keeps its source, geography, property type, and observation period attached.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {observations.map((observation) => (
                <div key={observation.id} className="cren-metric-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{observation.label}</p>
                  <p className="mt-1 font-[family-name:var(--mono)] text-xl font-semibold text-[color:var(--text-hero)]">{observation.value_display}</p>
                  <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                    {observation.property_type.replaceAll('-', ' ')} · period ending {observation.period_end}
                  </p>
                  <a href={observation.source_url} target="_blank" rel="noopener noreferrer" className="cren-text-link mt-2 inline-block text-xs">
                    Source: {observation.source_name}
                  </a>
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

        {/* Housing search and listing actions */}
        <section>
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
