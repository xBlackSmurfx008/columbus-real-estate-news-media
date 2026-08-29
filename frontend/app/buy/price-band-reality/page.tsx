import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { BUYER_PRICE_BANDS } from "@/lib/consumer-insights";

const buyerSourceLinks = [
  {
    title: "Central Ohio housing reports",
    text: "Use the latest Columbus REALTORS monthly report for market direction, inventory, and median-sale context.",
    href: "https://columbusrealtors.com/housing-reports",
  },
  {
    title: "Loan Estimate review",
    text: "Compare principal, interest, mortgage insurance, taxes, insurance, closing costs, and cash to close.",
    href: "https://www.consumerfinance.gov/owning-a-home/loan-estimate/",
  },
  {
    title: "Franklin County property records",
    text: "Check parcel, owner, transfer, tax, and property-context records before treating a listing as the full story.",
    href: "https://www.franklincountyohio.gov/Resident-Services/Property",
  },
  {
    title: "Columbus permit tracking",
    text: "For major updates, additions, or repair claims, verify permit history where Columbus records apply.",
    href: "https://www.columbus.gov/Business-Development/Get-a-Permit/Get-or-Track-a-Building-Permit?oc_lang=en-US",
  },
] as const;

const decisionSteps = [
  {
    title: "Start with payment, not list price",
    text: "A price band only helps if the monthly cost, cash to close, taxes, insurance, HOA dues, and repair exposure fit the buyer's real limits.",
  },
  {
    title: "Compare the substitute before the stretch",
    text: "If a preferred area forces too many tradeoffs, compare the adjacent area that solves the same commute, school/context, or local-life job.",
  },
  {
    title: "Separate condition from location",
    text: "The same band can mean move-in-ready in one area, dated systems in another, or a condo/HOA tradeoff somewhere else.",
  },
  {
    title: "Verify the exact address",
    text: "School attendance, tax district, municipality, permit history, flood/insurance context, and renovation quality can change the decision at the parcel level.",
  },
] as const;

const buyerContentQueue = [
  {
    title: "Where $300K-$450K Buyers Should Compare In Columbus",
    format: "Substitution guide",
    reader: "First-time and move-up buyers who are priced out of their first-choice area.",
    proof: "Current inventory spot check, recent comparable-sale context, area substitutes, and inspection caveats.",
  },
  {
    title: "Dublin Buyer Reality Check",
    format: "Area buyer guide",
    reader: "Relocators and families deciding whether the Dublin premium fits the whole household plan.",
    proof: "Boundary, tax, commute, school/context, and nearby-suburb comparison sources.",
  },
  {
    title: "German Village Historic-Home Buyer Checklist",
    format: "Due-diligence guide",
    reader: "Urban-core buyers weighing walkability against maintenance, preservation, and parking constraints.",
    proof: "Historic-review rules, permit paths, inspection questions, and nearby substitute areas.",
  },
] as const;

export const metadata: Metadata = {
  title: "Columbus Buyer Price-Band Reality",
  description:
    "Compare Columbus buyer budget bands by tradeoffs, nearby area substitutes, verification steps, and next actions before touring homes.",
  alternates: { canonical: "/buy/price-band-reality" },
};

export default function BuyerPriceBandRealityPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Buyer decision tool</div>
          <h1 className="cren-heading-xl">Columbus buyer price-band reality</h1>
          <p className="cren-body mt-3 max-w-3xl">
            A price band is not a promise of available listings. Use it to pressure-test tradeoffs, nearby substitutes, total ownership cost, and the questions to answer before you tour or make an offer.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {decisionSteps.map((step) => (
              <div key={step.title} className="cren-soft p-4">
                <h2 className="text-sm font-semibold text-[color:var(--text-hero)]">{step.title}</h2>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="cren-btn-row mt-6">
            <Link href="/subscribe?source=price-band-reality&topic=Buyer%20Price-Band%20Reality" className="cren-btn cren-btn-primary">
              Follow buyer alerts
            </Link>
            <Link href="/areas" className="cren-btn cren-btn-outline">Compare area hubs</Link>
          </div>
        </section>

        <section className="grid gap-5">
          {BUYER_PRICE_BANDS.map((band) => (
            <article key={band.id} className="cren-surface p-6 md:p-8" id={band.id}>
              <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
                <div>
                  <div className="section-eyebrow">Budget band</div>
                  <h2 className="cren-heading-lg">{band.label}</h2>
                  <p className="cren-body mt-3 text-sm">{band.summary}</p>
                  <p className="cren-body mt-3 text-sm">
                    Use this band as a shortlist builder, then verify active inventory and total monthly cost on the exact address before deciding whether the tradeoff is acceptable.
                  </p>
                  <Link href={band.nextStep.href} className="cren-text-link mt-4 inline-block text-sm font-semibold">
                    {band.nextStep.label}
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="cren-soft p-5">
                    <h3 className="font-semibold text-[color:var(--text-hero)]">Likely tradeoffs</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-secondary)]">
                      {band.likelyTradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}
                    </ul>
                  </div>
                  <div className="cren-soft p-5">
                    <h3 className="font-semibold text-[color:var(--text-hero)]">Verify before touring</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-secondary)]">
                      {band.verifyBeforeTouring.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">Areas to compare</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {band.areasToCompare.map((area) => (
                    <Link key={area.href} href={area.href} className="cren-action-chip">{area.label}</Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="cren-soft p-6 md:p-8">
          <h2 className="cren-heading-lg">Use this with current data</h2>
          <p className="cren-body mt-2 text-sm">
            Before acting, verify active listings, recent comparable sales, loan terms, taxes, insurance, HOA fees, inspection findings, school attendance areas, and municipality or county boundaries.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/market-data" className="cren-action-chip">Market data</Link>
            <Link href="/housing-search" className="cren-action-chip">Housing search</Link>
            <Link href="/areas/dublin" className="cren-action-chip">Dublin reality check</Link>
            <Link href="/areas/german-village" className="cren-action-chip">German Village reality check</Link>
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Source-backed checks</div>
          <h2 className="cren-heading-lg">What to verify before CREN treats a band as useful</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">
            CREN should update this page when current market data changes the practical tradeoffs. The source links below are starting points, not a substitute for address-level due diligence.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {buyerSourceLinks.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer" className="cren-soft cren-card-link p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{source.title}</h3>
                <p className="cren-body mt-2 text-sm">{source.text}</p>
                <span className="cren-text-link mt-3 inline-block text-sm">Open source</span>
              </a>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Next buyer content</div>
          <h2 className="cren-heading-lg">First articles this page should feed</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {buyerContentQueue.map((item) => (
              <article key={item.title} className="cren-soft p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">{item.format}</p>
                <h3 className="mt-2 font-semibold text-[color:var(--text-hero)]">{item.title}</h3>
                <p className="cren-body mt-2 text-sm">{item.reader}</p>
                <p className="mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm text-[color:var(--text-secondary)]">
                  Proof needed: {item.proof}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </CrenPage>
  );
}
