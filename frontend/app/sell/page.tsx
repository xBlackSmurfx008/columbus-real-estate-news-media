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
            Whether you own the home you live in or a rental you&apos;re ready to exit, start here.
            Direct offers, no commission, and local market context to back your decision.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/sell/your-home" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Sell your home without an agent</h2>
            <p className="cren-body mt-2 text-sm">
              Get a free, no-obligation offer. No 6% commission, no repairs, no showings. You pick the closing date.
            </p>
            <span className="cren-text-link mt-3 inline-block text-sm font-semibold">Get my free offer →</span>
          </Link>
          <Link href="/sell/investment-property" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Sell a rental or portfolio</h2>
            <p className="cren-body mt-2 text-sm">
              Exit quietly and off-market. As-is condition, tenants in place, no listing disruption.
            </p>
            <span className="cren-text-link mt-3 inline-block text-sm font-semibold">Start the conversation →</span>
          </Link>
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
