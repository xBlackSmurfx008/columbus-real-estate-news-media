import Link from "next/link";

export function IntentRail() {
  return (
    <section data-section-id="intent-rail" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Link href="/buy" className="cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5">
        <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Buy in Columbus</h2>
        <p className="cren-body mt-2 text-sm">Track inventory shifts, pricing movement, and neighborhood fit.</p>
        <p className="cren-text-link mt-3 text-sm font-semibold">Explore buyer resources</p>
      </Link>
      <Link href="/sell" className="cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5">
        <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Sell in Columbus</h2>
        <p className="cren-body mt-2 text-sm">Use local demand signals and timing indicators to list smarter.</p>
        <p className="cren-text-link mt-3 text-sm font-semibold">See seller strategy</p>
      </Link>
      <Link href="/rent" className="cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5">
        <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Rent in Columbus</h2>
        <p className="cren-body mt-2 text-sm">Compare areas quickly with renter-focused insights and trends.</p>
        <p className="cren-text-link mt-3 text-sm font-semibold">Find rental insights</p>
      </Link>
      <Link href="/invest" className="cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5">
        <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Invest in Columbus</h2>
        <p className="cren-body mt-2 text-sm">Market signals, development pipeline, and submarket intel for investors.</p>
        <p className="cren-text-link mt-3 text-sm font-semibold">Open investor hub</p>
      </Link>
    </section>
  );
}
