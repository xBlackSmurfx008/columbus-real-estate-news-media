import type { Metadata } from 'next';
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { getLatestMarketObservations, getMarketData, DbMarketObservation, DbMarketSnapshot, DbNeighborhood } from "@/lib/public-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Columbus Housing Market Data',
  description: 'Columbus housing and rental indicators with definitions, source context, and links to local analysis.',
  alternates: { canonical: '/market-data' },
};

function directionClass(direction: string): string {
  if (direction === "up") return "cren-data-up";
  if (direction === "down") return "cren-data-down";
  return "cren-data-neutral";
}

export default async function MarketDataPage() {
  let observations: DbMarketObservation[] = [];
  let snapshot: DbMarketSnapshot[] = [];
  let neighborhoods: DbNeighborhood[] = [];

  try {
    const [data, latestObservations] = await Promise.all([getMarketData(), getLatestMarketObservations()]);
    snapshot = data.snapshot;
    neighborhoods = data.neighborhoods;
    observations = latestObservations;
  } catch {
    // Will show empty state
  }

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Market Data</div>
          <h1 className="cren-heading-xl">Columbus Market Data</h1>
          <p className="cren-body mt-2 max-w-2xl">
            The latest stored Columbus-area housing snapshot. Reporting periods and geographies vary by metric; use the source and methodology notes before comparing figures.
          </p>
        </div>

        {observations.length > 0 ? (
          <section className="cren-surface p-6 md:p-8">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="cren-heading-lg">Source-aware measures</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Latest verified observation by area and measure</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Measure</th>
                    <th className="pb-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Area</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Value</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Period ending</th>
                    <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {observations.map((observation, index) => {
                    const areaHref = observation.geography_type === "national"
                      ? null
                      : `/areas/${observation.geography_slug}`;
                    return (
                      <tr key={observation.id} className={`border-b border-[color:var(--border)]/50 ${index % 2 === 0 ? "" : "bg-[color:var(--bg-surface)]"}`}>
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-[color:var(--text-hero)]">{observation.label}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{observation.property_type}</p>
                        </td>
                        <td className="px-4 py-3">
                          {areaHref ? (
                            <Link href={areaHref} className="cren-text-link font-semibold">{observation.geography_label}</Link>
                          ) : (
                            <span className="text-[color:var(--text-secondary)]">{observation.geography_label}</span>
                          )}
                          <p className="text-xs text-[color:var(--text-muted)]">{observation.geography_type}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-[family-name:var(--mono)] font-semibold text-[color:var(--text-hero)]">{observation.value_display}</td>
                        <td className="px-4 py-3 text-right text-[color:var(--text-secondary)]">
                          <p>{observation.period_end}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">as of {observation.as_of_date}</p>
                        </td>
                        <td className="pl-4 py-3">
                          <a href={observation.source_url} target="_blank" rel="noopener noreferrer" className="cren-text-link">{observation.source_name}</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="cren-body mt-4 text-xs text-[color:var(--text-muted)]">Measures are published with their geography, property type, reporting period, and source. They are not appraisals, rent quotes, or mortgage offers.</p>
          </section>
        ) : null}

        {/* Legacy supplemental snapshot */}
        {snapshot.length > 0 && <section className="cren-surface p-6 md:p-8">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="cren-heading-lg">{observations.length > 0 ? "Legacy supplemental snapshot" : "Market Snapshot"}</h2>
            <p className="text-xs text-[color:var(--text-muted)]">Latest stored snapshot; individual data periods vary</p>
          </div>
          {snapshot.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.map((m) => (
                <div key={m.id} className="cren-metric-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{m.label}</p>
                  <p className="mt-1 font-[family-name:var(--mono)] text-2xl font-semibold text-[color:var(--text-hero)]">{m.value}</p>
                  <p className={`mt-1 text-sm ${directionClass(m.direction)}`}>{m.change}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="cren-body text-[color:var(--text-muted)]">Market data loading...</p>
          )}
        </section>}

        {/* Neighborhood Comparison */}
        {neighborhoods.length > 0 && (
          <section className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg mb-4">{observations.length > 0 ? "Legacy neighborhood comparison" : "Neighborhood Comparison"}</h2>
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
            {observations.length > 0
              ? "Source-aware observations are the primary display. Individual measures remain subject to each source's definitions, revisions, and geographic limitations."
              : "Legacy dashboard rows do not yet expose source URL, observation date, geography, and property type on every individual metric. Do not use an unlabeled row as an appraisal, rent quote, mortgage offer, or prediction."}
          </p>
          <Link href="/blog" className="cren-text-link mt-4 inline-block text-sm font-semibold">
            Read latest analysis
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
