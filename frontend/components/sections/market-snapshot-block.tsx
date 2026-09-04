import { formatPeriod, getCanonicalMarketData, selectHeadlineMetrics } from "@/lib/market-data";

type MarketSnapshotBlockProps = {
  /** When false, only the updated line shows above the grid (page supplies H1 elsewhere). */
  showSectionTitle?: boolean;
};

/**
 * Reusable in-article market block. It reads the canonical market set rather
 * than carrying its own copy of the numbers, and it states a real update date
 * instead of a hand-written "updated N hours ago" line.
 */
export async function MarketSnapshotBlock({ showSectionTitle = true }: MarketSnapshotBlockProps) {
  const set = await getCanonicalMarketData();
  const metrics = selectHeadlineMetrics(set, 4);
  const updatedLine = set.updatedAt
    ? `Updated ${set.updatedAt} · sources listed on each measure`
    : "Update date unavailable";

  if (metrics.length === 0) return null;

  return (
    <section data-section-id="market-snapshot" className="cren-surface p-6 md:p-8">
      {showSectionTitle ? (
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="cren-heading-lg">Market snapshot</h2>
          <p className="text-xs text-[color:var(--text-muted)]">{updatedLine}</p>
        </div>
      ) : (
        <p className="cren-body mb-4 text-xs">{updatedLine}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="cren-metric-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{metric.label}</p>
            <p className="mt-1 font-[family-name:var(--mono)] text-2xl font-semibold text-[color:var(--text-hero)]">{metric.value}</p>
            {metric.changeLabel && (
              <p
                className={`mt-1 text-sm ${
                  metric.direction === "up" ? "cren-data-up" : metric.direction === "down" ? "cren-data-down" : "cren-data-neutral"
                }`}
              >
                {metric.changeLabel}
              </p>
            )}
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              {metric.geography.label} · {formatPeriod(metric)}
              {metric.source.name ? ` · ${metric.source.name}` : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
