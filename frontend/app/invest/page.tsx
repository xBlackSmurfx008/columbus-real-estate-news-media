import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";

const cardClass = "cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5";

export default function InvestPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Invest</div>
          <h1 className="cren-heading-xl">Invest in Columbus real estate</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Data-driven coverage for rental yield, development pipeline, multifamily trends, and neighborhood-level demand—without the noise of a listing portal.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/topics/market-trends" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Market &amp; pricing signals</h2>
            <p className="cren-body mt-2 text-sm">
              Track inventory, days on market, and rent vs. buy context to stress-test assumptions.
            </p>
          </Link>
          <Link href="/topics/development" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Development pipeline</h2>
            <p className="cren-body mt-2 text-sm">
              Follow permits, new supply, and corridor-level projects that affect future comps.
            </p>
          </Link>
          <Link href="/market-data" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Market data hub</h2>
            <p className="cren-body mt-2 text-sm">
              Skimmable metro indicators updated on a regular cadence for quick underwriting checks.
            </p>
          </Link>
          <Link href="/blog" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Investor-focused briefs</h2>
            <p className="cren-body mt-2 text-sm">
              Read data briefs and policy updates that affect cash flow and exit timing.
            </p>
          </Link>
          <Link href="/areas" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Neighborhood hubs</h2>
            <p className="cren-body mt-2 text-sm">
              Compare submarkets by demand profile, schools, and local development story.
            </p>
          </Link>
          <Link href="/subscribe?source=invest-page" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Investor alerts</h2>
            <p className="cren-body mt-2 text-sm">
              Subscribe by area and topic for weekly market and development intelligence.
            </p>
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
