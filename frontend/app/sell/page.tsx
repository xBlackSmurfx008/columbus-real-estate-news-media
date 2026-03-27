import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";

const cardClass = "cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5";

export default function SellPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Sell</div>
          <h1 className="cren-heading-xl">Sell smarter in the Columbus market</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Use local pricing shifts, demand signals, and neighborhood-level content strategy to position listings effectively.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/market-data" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Market data strip</h2>
            <p className="cren-body mt-2 text-sm">Quick-read indicators for pricing, days on market, and listing momentum.</p>
          </Link>
          <Link href="/topics/development" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Development watch</h2>
            <p className="cren-body mt-2 text-sm">Track supply pipeline updates that can influence seller timing.</p>
          </Link>
          <Link href="/advertise" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Agent and team visibility</h2>
            <p className="cren-body mt-2 text-sm">Explore sponsor placements tied to active buyer intent traffic.</p>
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
