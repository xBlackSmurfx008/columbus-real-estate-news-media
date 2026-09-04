import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import {
  FIRST_DIRECTORY_PILOT_PACKAGE,
  SPONSOR_PACKAGE_DEFINITIONS,
  SPONSOR_REPORTING_EXAMPLE,
} from "@/lib/directory-sponsorship";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/advertise/media-kit",
  title: "CREN Media Kit and Rate Card",
  description:
    "Advertiser products, rate-card posture, labeling rules, reporting, and the claim-review requirements every Columbus Real Estate News campaign must meet.",
});

const audiencePromises = [
  {
    label: "Columbus housing intent",
    detail: "Readers arrive through rent, buy, sell, invest, neighborhood, market-data, directory, and local-development paths.",
  },
  {
    label: "Verified claims only",
    detail: "Audience size, open rate, traffic, and lead-quality claims must come from CREN analytics or advertiser-grade reports before sales use.",
  },
  {
    label: "Sponsor-safe labeling",
    detail: "Paid placements use visible labels before the click and on the destination surface.",
  },
  {
    label: "Reportable outcomes",
    detail: "Packages are structured around sends, views, clicks, profile actions, leads where applicable, issues, and renewal recommendations.",
  },
] as const;

const requiredMaterials = [
  "Legal advertiser name and public brand name.",
  "Campaign goal, preferred dates, geography, and audience intent.",
  "Landing URL, public contact path, and any UTM requirements.",
  "Copy, logo/image assets, alt text, and rights acknowledgement.",
  "Proof for prices, rates, availability, discounts, credentials, guarantees, awards, rankings, or performance claims.",
  "Fair-housing, lending, insurance, legal, securities, or professional-license review contact when relevant.",
] as const;

export default function MediaKitPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-7 md:p-10">
          <div className="section-eyebrow">Advertiser Media Kit</div>
          <h1 className="cren-heading-xl">Reach Columbus housing decisions without buying editorial influence</h1>
          <p className="cren-body mt-3 max-w-3xl">
            CREN sells labeled distribution, useful profile visibility, and reportable local attention for apartments, agents, lenders, vendors,
            developers, builders, events, and home-service companies. Editorial coverage, rankings, corrections, source treatment, and conclusions
            are not for sale.
          </p>
          <div className="cren-btn-row mt-6">
            <Link href="/advertise#advertising-inquiry" className="cren-btn cren-btn-primary">Request a proposal</Link>
            <Link href="/advertise/self-service" className="cren-btn cren-btn-outline">Start self-service ad</Link>
            <Link href="/advertising-terms" className="cren-btn cren-btn-outline">Advertising terms</Link>
            <Link href="/sponsored-content-policy" className="cren-btn cren-btn-outline">Sponsor policy</Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {audiencePromises.map((item) => (
            <article key={item.label} className="cren-surface p-5">
              <h2 className="font-semibold text-[color:var(--text-hero)]">{item.label}</h2>
              <p className="cren-body mt-2 text-sm">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Product sheets and rate card</div>
          <h2 className="cren-heading-lg">Launch packages</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">
            Rates below are launch-pilot posture and should be confirmed against available inventory, analytics, make-good terms, and sales capacity
            before a final insertion order is accepted.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {SPONSOR_PACKAGE_DEFINITIONS.map((item) => (
              <article key={item.name} className="cren-soft p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-hero)]">{item.name}</h3>
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{item.bestFor}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-[family-name:var(--font-space-grotesk)] text-xl font-semibold text-[color:var(--green)]">{item.price}</div>
                    <div className="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">{item.term}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Deliverables</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                      {item.deliverables.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Reporting</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                      {item.reporting.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 text-xs text-[color:var(--text-muted)]">Required labels: {item.labels.join(", ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Apartment and services wedge</div>
          <h2 className="cren-heading-lg">{FIRST_DIRECTORY_PILOT_PACKAGE.name}</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">{FIRST_DIRECTORY_PILOT_PACKAGE.readerJob}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="cren-soft p-4 text-sm">
              <strong>Launch criteria</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--text-secondary)]">
                {FIRST_DIRECTORY_PILOT_PACKAGE.launchCriteria.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article className="cren-soft p-4 text-sm">
              <strong>Deliverables</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--text-secondary)]">
                {FIRST_DIRECTORY_PILOT_PACKAGE.deliverables.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
          <article className="cren-surface p-6 md:p-8">
            <div className="section-eyebrow">Advertiser intake</div>
            <h2 className="cren-heading-lg">Materials needed before quoting</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[color:var(--text-secondary)]">
              {requiredMaterials.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="cren-surface p-6 md:p-8">
            <div className="section-eyebrow">Campaign report example</div>
            <h2 className="cren-heading-lg">{SPONSOR_REPORTING_EXAMPLE.sponsor}</h2>
            <p className="cren-body mt-2 text-sm">{SPONSOR_REPORTING_EXAMPLE.flight}</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[color:var(--text-secondary)]">
              {SPONSOR_REPORTING_EXAMPLE.metrics.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="cren-body mt-4 text-sm">{SPONSOR_REPORTING_EXAMPLE.note}</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--text-hero)]">{SPONSOR_REPORTING_EXAMPLE.renewalRecommendation}</p>
          </article>
        </section>
      </div>
    </CrenPage>
  );
}
