import type { Metadata } from 'next';
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import {
  formatPeriod,
  getCanonicalMarketData,
  marketDataStructuredData,
  selectAllMetrics,
  selectHeadlineMetrics,
  type MarketDataSet,
  type MarketMetric,
} from "@/lib/market-data";
import { EMPTY_MARKET_DATA_SET } from "@/lib/market-data-core";
import { getMarketData, DbNeighborhood } from "@/lib/public-data";
import { SITE_URL } from "@/lib/site";
import { pageMetadata } from "@/lib/page-metadata";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  path: "/market-data",
  title: "Columbus Housing Market Data",
  description:
    "Columbus housing and rental indicators with plain definitions, the source and date behind every number, and links to the local analysis that explains them.",
});

function directionClass(direction: string): string {
  if (direction === "up") return "cren-data-up";
  if (direction === "down") return "cren-data-down";
  return "cren-data-neutral";
}

function MetricCard({ metric }: { metric: MarketMetric }) {
  return (
    <div className="cren-metric-inner">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{metric.label}</p>
      <p className="mt-1 font-[family-name:var(--mono)] text-2xl font-semibold text-[color:var(--text-hero)]">{metric.value}</p>
      {metric.changeLabel && <p className={`mt-1 text-sm ${directionClass(metric.direction)}`}>{metric.changeLabel}</p>}
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">{metric.geography.label} · {formatPeriod(metric)}</p>
      {metric.source.url && metric.source.name ? (
        <a href={metric.source.url} target="_blank" rel="noopener noreferrer" className="cren-text-link mt-1 inline-block text-xs">
          Source: {metric.source.name}
        </a>
      ) : (
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">Source not attached — treat as unverified</p>
      )}
    </div>
  );
}

export default async function MarketDataPage() {
  let marketSet: MarketDataSet = EMPTY_MARKET_DATA_SET;
  let neighborhoods: DbNeighborhood[] = [];

  try {
    const [set, legacy] = await Promise.all([getCanonicalMarketData(), getMarketData()]);
    marketSet = set;
    neighborhoods = legacy.neighborhoods;
  } catch {
    // Will show empty state
  }

  // Same canonical set, same selector the homepage uses: the headline bar here
  // cannot report a different number from the one on the homepage.
  const headline = selectHeadlineMetrics(marketSet);
  const allMetrics = selectAllMetrics(marketSet);
  const structuredData = marketDataStructuredData(marketSet, `${SITE_URL}/market-data`);

  return (
    <CrenPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Market Data</div>
          <h1 className="cren-heading-xl">Columbus Market Data</h1>
          <p className="cren-body mt-2 max-w-2xl">
            The latest stored Columbus-area housing snapshot. Reporting periods and geographies vary by metric; use the source and methodology notes before comparing figures.
          </p>
        </div>

        <section className="cren-surface p-6 md:p-8">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="cren-heading-lg">Headline indicators</h2>
            <p className="text-xs text-[color:var(--text-muted)]">
              {marketSet.updatedAt ? `Canonical set updated ${marketSet.updatedAt}` : "Update date unavailable"}
              {marketSet.fromFallback ? " · serving last-known-good snapshot" : ""}
            </p>
          </div>
          {headline.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {headline.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          ) : (
            <p className="cren-body text-[color:var(--text-muted)]">Headline indicators are unavailable right now.</p>
          )}
          <p className="cren-body mt-4 text-xs text-[color:var(--text-muted)]">
            These are the same values the homepage stat bar and the CREN embed render — one canonical record per measure,
            geography, and period.
          </p>
        </section>

        {allMetrics.length > 0 && (
          <section className="cren-surface p-6 md:p-8">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="cren-heading-lg">All measures</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Latest verified record by measure, area, and property type</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Measure</th>
                    <th className="pb-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Area</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Value</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Period</th>
                    <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {allMetrics.map((metric, index) => {
                    const areaHref = metric.geography.type === "national" || metric.geography.type === "metro"
                      ? null
                      : `/areas/${metric.geography.slug}`;
                    return (
                      <tr key={metric.id} className={`border-b border-[color:var(--border)]/50 ${index % 2 === 0 ? "" : "bg-[color:var(--bg-surface)]"}`}>
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-[color:var(--text-hero)]">{metric.label}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{metric.propertyType.replaceAll("-", " ")}</p>
                        </td>
                        <td className="px-4 py-3">
                          {areaHref ? (
                            <Link href={areaHref} className="cren-text-link font-semibold">{metric.geography.label}</Link>
                          ) : (
                            <span className="text-[color:var(--text-secondary)]">{metric.geography.label}</span>
                          )}
                          <p className="text-xs text-[color:var(--text-muted)]">{metric.geography.type}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-[family-name:var(--mono)] font-semibold text-[color:var(--text-hero)]">
                          {metric.value}
                          {metric.changeLabel && (
                            <span className={`ml-2 text-xs font-normal ${directionClass(metric.direction)}`}>{metric.changeLabel}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[color:var(--text-secondary)]">
                          <p>{formatPeriod(metric)}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {metric.source.asOf ? `as of ${metric.source.asOf}` : "observation date not stated"}
                          </p>
                        </td>
                        <td className="pl-4 py-3">
                          {metric.source.url && metric.source.name ? (
                            <a href={metric.source.url} target="_blank" rel="noopener noreferrer" className="cren-text-link">{metric.source.name}</a>
                          ) : (
                            <span className="text-xs text-[color:var(--text-muted)]">Source not attached — treat as unverified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="cren-body mt-4 text-xs text-[color:var(--text-muted)]">Measures are published with their geography, property type, reporting period, and source. They are not appraisals, rent quotes, or mortgage offers.</p>
          </section>
        )}


        {/* Neighborhood Comparison */}
        {neighborhoods.length > 0 && (
          <section className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg mb-4">Neighborhood comparison</h2>
            <p className="cren-body mb-6 text-sm text-[color:var(--text-secondary)]">
              Side-by-side data for {neighborhoods.length} Columbus neighborhoods. Click any row for the full area report.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Neighborhood</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Typical Value</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">YoY</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Avg Rent</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">DOM</th>
                    <th className="pb-3 pl-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {neighborhoods.map((n, idx) => {
                    const slug = n.name === "Columbus (city avg)"
                      ? "columbus-citywide"
                      : n.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/--+/g, "-");
                    return (
                      <tr
                        key={n.id}
                        className={`border-b border-[color:var(--border)]/50 transition-colors hover:bg-[color:var(--green)]/5 ${idx % 2 === 0 ? "" : "bg-[color:var(--bg-surface)]"}`}
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/areas/${slug}`}
                            className="font-semibold text-[color:var(--text-hero)] no-underline hover:text-[color:var(--green)] transition-colors"
                          >
                            {n.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--mono)] font-semibold text-[color:var(--text-hero)]">
                          {n.median}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={n.yoy.startsWith("+") ? "cren-data-up" : "cren-data-down"}>
                            {n.yoy}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-[color:var(--text-secondary)]">{n.rent}</td>
                        <td className="py-3 px-4 text-right text-[color:var(--text-secondary)]">{n.dom}</td>
                        <td className="py-3 pl-4 text-right">
                          <span className="inline-block rounded-full bg-[color:var(--green)]/10 px-2 py-0.5 text-xs font-medium text-[color:var(--green)]">
                            {n.inventory}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Methodology */}
        <div className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Methodology</h2>
          <p className="cren-body mt-2 text-sm">
            Columbus REALTORS monthly reports supply local sale-price, listing, sales, and market-time measures. Freddie Mac&apos;s PMMS is a national weekly mortgage-rate average,
            not a Columbus borrower quote. Zillow&apos;s ZHVI estimates typical home value and is different from a median sale price. Redfin&apos;s downloadable series use their own
            geography, rolling-period, seasonal-adjustment, and revision rules. CREN does not treat these measures as interchangeable.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <a href="https://columbusrealtors.com/" target="_blank" rel="noopener noreferrer" className="cren-text-link">Columbus REALTORS market reports</a>
            <a href="https://www.freddiemac.com/pmms" target="_blank" rel="noopener noreferrer" className="cren-text-link">Freddie Mac PMMS</a>
            <a href="https://www.zillow.com/research/tag/zillow-home-value-index/" target="_blank" rel="noopener noreferrer" className="cren-text-link">Zillow ZHVI methodology</a>
            <a href="https://www.redfin.com/news/data-center/methodology/" target="_blank" rel="noopener noreferrer" className="cren-text-link">Redfin methodology</a>
          </div>
          <p className="cren-body mt-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] p-3 text-xs">
            Every measure above comes from the one canonical market-data record for that measure, geography, and period.
            Individual measures remain subject to each source&apos;s definitions, revisions, and geographic limitations.
          </p>
          <Link href="/blog" className="cren-text-link mt-4 inline-block text-sm font-semibold">
            Read latest analysis
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
