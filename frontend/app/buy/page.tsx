import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { pageMetadata } from "@/lib/page-metadata";

const cardClass = "cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5";

export const metadata: Metadata = pageMetadata({
  path: "/buy",
  title: "Buy a Home in Columbus, Ohio",
  description:
    "Columbus buyer guidance from a local newsroom: price-band tradeoffs, neighborhood comparisons, school-zone demand, and the market data behind your timing.",
});

export default function BuyPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Buy</div>
          <h1 className="cren-heading-xl">Buy in Columbus with confidence</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Track neighborhood trends, school context, and active-market timing to make stronger buying decisions.
          </p>
          <div className="cren-btn-row mt-6">
            <Link href="/buy/price-band-reality" className="cren-btn cren-btn-primary">Price-band reality</Link>
            <Link href="/areas" className="cren-btn cren-btn-outline">Compare areas</Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link href="/buy/price-band-reality" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Buyer price-band reality</h2>
            <p className="cren-body mt-2 text-sm">Compare budget bands, tradeoffs, nearby substitutes, and what to verify before you tour.</p>
          </Link>
          <Link href="/topics/market-trends" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Market movement</h2>
            <p className="cren-body mt-2 text-sm">Read citywide and neighborhood-level pricing and inventory briefs.</p>
          </Link>
          <Link href="/topics/schools" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">School-zone context</h2>
            <p className="cren-body mt-2 text-sm">Compare district-level demand pressure before touring homes.</p>
          </Link>
          <Link href="/subscribe?source=buy-page" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Buyer alerts</h2>
            <p className="cren-body mt-2 text-sm">Get weekly updates by area and topic directly in your inbox.</p>
          </Link>
          <Link href="/rent/find-a-home" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Renting first?</h2>
            <p className="cren-body mt-2 text-sm">Get free help finding a Columbus rental while you plan your purchase.</p>
          </Link>
          <Link href="/invest/deploy-capital" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Buying as an investment?</h2>
            <p className="cren-body mt-2 text-sm">Talk to local investors about putting your capital to work in Central Ohio.</p>
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
