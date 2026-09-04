import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { AdvertisingInquiryForm } from "@/components/advertising-inquiry-form";
import { SPONSOR_PACKAGE_DEFINITIONS } from "@/lib/directory-sponsorship";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/advertise/self-service",
  title: "Self-Service CREN Ad Intake",
  description:
    "Select a CREN advertising package, submit your campaign details, accept the advertising terms, and enter the managed-sales review queue in one sitting.",
});

const intakeSteps = [
  "Select the closest package and describe audience, geography, date, budget, and desired reader action.",
  "Submit advertiser contact details, landing URL, copy notes, claims, and assets or links that need review.",
  "CREN records the advertiser account, campaign inquiry, consent version, and initial asset note for admin review.",
  "Staff confirms claim substantiation, labels, inventory, timing, invoice or insertion-order terms, and reporting cadence before scheduling.",
] as const;

export default function SelfServiceAdvertisingPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-7 md:p-10">
          <div className="section-eyebrow">Self-service ad intake</div>
          <h1 className="cren-heading-xl">Start a CREN advertising order</h1>
          <p className="cren-body mt-3 max-w-3xl">
            This is the first self-service advertising path for simple placements. It does not charge a card yet. CREN reviews labels, claims,
            availability, inventory, and insertion-order terms before a campaign is accepted or scheduled.
          </p>
          <div className="cren-btn-row mt-6">
            <Link href="/advertise/media-kit" className="cren-btn cren-btn-primary">Review media kit</Link>
            <Link href="/advertising-terms" className="cren-btn cren-btn-outline">Advertising terms</Link>
            <Link href="/sponsored-content-policy" className="cren-btn cren-btn-outline">Sponsor policy</Link>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
          <article className="cren-surface p-6 md:p-8">
            <div className="section-eyebrow">How it works</div>
            <h2 className="cren-heading-lg">Managed review after submission</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[color:var(--text-secondary)]">
              {intakeSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </article>
          <article className="cren-surface p-6 md:p-8">
            <div className="section-eyebrow">Launch packages</div>
            <h2 className="cren-heading-lg">Available package choices</h2>
            <div className="mt-4 grid gap-3">
              {SPONSOR_PACKAGE_DEFINITIONS.map((item) => (
                <div key={item.name} className="cren-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong className="text-[color:var(--text-hero)]">{item.name}</strong>
                    <span className="text-sm font-semibold text-[color:var(--green)]">{item.price} / {item.term}</span>
                  </div>
                  <p className="cren-body mt-1 text-sm">{item.bestFor}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="cren-surface p-6 md:p-8" id="self-service-ad-form">
          <div className="section-eyebrow">Campaign intake</div>
          <h2 className="cren-heading-lg">Submit your placement request</h2>
          <p className="cren-body mt-2 mb-6 max-w-3xl text-sm">
            Include the package, dates, geography, landing page, claim details, creative notes, and any asset links in the message field. Objective
            claims require proof before publication.
          </p>
          <AdvertisingInquiryForm
            source="advertise-self-service"
            submitLabel="Submit ad order for review"
            successMessage="Your ad order request is in the campaign review queue."
          />
        </section>
      </div>
    </CrenPage>
  );
}
