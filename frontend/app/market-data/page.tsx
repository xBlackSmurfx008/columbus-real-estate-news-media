import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { getMarketData, DbMarketSnapshot, DbNeighborhood } from "@/lib/public-data";

export const revalidate = 300;

function directionClass(direction: string): string {
  if (direction === "up") return "cren-data-up";
  if (direction === "down") return "cren-data-down";
  return "cren-data-neutral";
}

export default async function MarketDataPage() {
  let snapshot: DbMarketSnapshot[] = [];
  let neighborhoods: DbNeighborhood[] = [];

  try {
    const data = await getMarketData();
    snapshot = data.snapshot;
    neighborhoods = data.neighborhoods;
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
            Real-time market indicators for the Columbus metro area. Data sourced from local MLS aggregates and updated regularly.
          </p>
        </div>

        {/* Market Snapshot */}
        <section className="cren-surface p-6 md:p-8">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="cren-heading-lg">Market Snapshot</h2>
            <p className="text-xs text-[color:var(--text-muted)]">Updated regularly | Source: Local MLS aggregates</p>
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
        </section>

        {/* Neighborhood Comparison */}
        {neighborhoods.length > 0 && (
          <section className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg mb-4">Neighborhood Comparison</h2>
            <p className="cren-body mb-6 text-sm text-[color:var(--text-secondary)]">
              Side-by-side data for {neighborhoods.length} Columbus neighborhoods. Click any row for the full area report.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Neighborhood</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Median Price</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">YoY</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Avg Rent</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">DOM</th>
                    <th className="pb-3 pl-4 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {neighborhoods.map((n, idx) => {
                    const slug = n.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/--+/g, "-");
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
            Figures reflect a rolling snapshot of listing and rent observations across the Columbus metro. Sources include Columbus REALTORS MLS,
            CoStar, and proprietary data collection. Pair with our neighborhood hubs and analysis articles for deeper interpretation.
          </p>
          <Link href="/blog" className="cren-text-link mt-4 inline-block text-sm font-semibold">
            Read latest analysis
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
