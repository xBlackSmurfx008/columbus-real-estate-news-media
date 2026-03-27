import { marketSnapshotMetrics } from "@/lib/market-snapshot";

type MarketSnapshotBlockProps = {
  /** When false, only the updated line shows above the grid (page supplies H1 elsewhere). */
  showSectionTitle?: boolean;
  updatedLine?: string;
};

export function MarketSnapshotBlock({
  showSectionTitle = true,
  updatedLine = "Updated 6 hours ago | Source: Local MLS aggregates",
}: MarketSnapshotBlockProps) {
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
        {marketSnapshotMetrics.map((m) => (
          <div key={m.label} className="cren-metric-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{m.label}</p>
            <p className="mt-1 font-[family-name:var(--mono)] text-2xl font-semibold text-[color:var(--text-hero)]">{m.value}</p>
            <p className={`mt-1 text-sm ${m.changeClassName}`}>{m.change}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
