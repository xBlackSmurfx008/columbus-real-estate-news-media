import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { RenterDueDiligenceChecklist } from "@/components/renter-due-diligence-checklist";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/rent/before-you-sign",
  title: "Before You Sign a Columbus Lease",
  description:
    "A Columbus renter due-diligence checklist for fees, utilities, maintenance, owner verification, daily-life fit, lease risk, public records, and reviews.",
});

const resourceCards = [
  {
    title: "Franklin County property records",
    href: "https://www.franklincountyohio.gov/Resident-Services/Property",
    text: "Use county property tools to compare address, owner, parcel, recorder, and tax context.",
  },
  {
    title: "Columbus code enforcement",
    href: "https://www.columbus.gov/Business-Development/Building-Zoning-Services/Code-Enforcement",
    text: "Check city code-enforcement resources for housing, zoning, nuisance, sanitation, and safety paths.",
  },
  {
    title: "Ohio landlord obligations",
    href: "https://codes.ohio.gov/ohio-revised-code/section-5321.04",
    text: "Use Ohio Revised Code language as a starting point, then get legal help for specific disputes.",
  },
  {
    title: "OSU off-campus housing",
    href: "https://offcampus.osu.edu/",
    text: "Use Ohio State's off-campus housing and commuter resources for campus-area rental decisions.",
  },
  {
    title: "Ohio rental scam warnings",
    href: "https://www.ohioattorneygeneral.gov/Media/News-Releases/June-2017/Attorney-General-DeWine-Warns-of-Home-Rental-Scams",
    text: "Check state consumer guidance before sending deposits through irreversible or suspicious channels.",
  },
] as const;

const renterFieldGuide = [
  {
    title: "Before you apply",
    text: "Confirm the advertised rent, all required fees, refund rules, application sequence, and who is authorized to collect money. Save screenshots before a listing changes.",
    checks: ["Application fee", "Admin or holding fee", "Deposit rules", "Authorized manager", "Refund language"],
  },
  {
    title: "Before you tour",
    text: "Treat the tour as a systems check. Look for evidence of water intrusion, weak locks, heating or cooling issues, pest entry points, package handling, trash, parking, and noise exposure.",
    checks: ["A/C and heat", "Locks and windows", "Trash and pests", "Parking rules", "Package handling"],
  },
  {
    title: "Before you sign",
    text: "Read the lease for renewal deadlines, entry-notice language, roommate and sublet limits, move-out charges, repair process, utilities, insurance, and payment method requirements.",
    checks: ["Renewal deadline", "Entry notice", "Roommate rules", "Repair process", "Move-out charges"],
  },
  {
    title: "Before move-in",
    text: "Document condition before furniture arrives. Keep copies of photos, videos, payment receipts, fee sheets, emails, lease drafts, and written answers from the owner or manager.",
    checks: ["Photo record", "Utility setup", "Key handoff", "Written answers", "Receipt copies"],
  },
] as const;

const localRenterPaths = [
  {
    title: "OSU student and parent path",
    text: "Campus-area renters need lease timing, roommate rules, package security, parking, emergency maintenance, and parent/guarantor review before signing.",
    href: "/areas/ohio-state-university-area",
    cta: "Open OSU Area checks",
  },
  {
    title: "Franklinton renter path",
    text: "Franklinton renters should verify project status, parking, transit, code records, flood/insurance context where relevant, and block-level daily-life fit.",
    href: "/areas/franklinton",
    cta: "Open Franklinton checks",
  },
  {
    title: "Unknown landlord path",
    text: "When a listing source is unclear, verify owner or manager authority before sending money, especially if the payment path is urgent or irreversible.",
    href: "/housing-search#rent",
    cta: "Compare rental sources",
  },
] as const;

export default function BeforeYouSignPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Renter due diligence</div>
          <h1 className="cren-heading-xl">Before you sign a Columbus lease</h1>
          <p className="cren-body mt-3 max-w-3xl">
            Photos and advertised rent are only the first layer. Check the full monthly cost, written terms, owner or manager proof, maintenance expectations, daily routine, public records, and review patterns before paying.
          </p>
          <div className="cren-btn-row mt-6">
            <Link href="/rent/find-a-home" className="cren-btn cren-btn-primary">Request rental help</Link>
            <Link href="/subscribe?source=before-you-sign&topic=Before%20You%20Sign" className="cren-btn cren-btn-outline">Get renter alerts</Link>
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Renter field guide</div>
          <h2 className="cren-heading-lg">What to check at each decision point</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {renterFieldGuide.map((step) => (
              <article key={step.title} className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{step.title}</h3>
                <p className="cren-body mt-2 text-sm">{step.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {step.checks.map((check) => (
                    <span key={check} className="cren-action-chip">{check}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <RenterDueDiligenceChecklist />

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Verification sources</div>
          <h2 className="cren-heading-lg">Use records before relying on a listing</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {resourceCards.map((card) => (
              <a key={card.href} href={card.href} target="_blank" rel="noopener noreferrer" className="cren-soft cren-card-link p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{card.title}</h3>
                <p className="cren-body mt-2 text-sm">{card.text}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Local renter paths</div>
          <h2 className="cren-heading-lg">Turn the checklist into an area-specific decision</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {localRenterPaths.map((path) => (
              <Link key={path.href} href={path.href} className="cren-soft cren-card-link p-5 no-underline">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{path.title}</h3>
                <p className="cren-body mt-2 text-sm">{path.text}</p>
                <span className="cren-text-link mt-3 inline-block text-sm">{path.cta}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="cren-soft p-6 md:p-8">
          <h2 className="cren-heading-lg">Next renter paths</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/areas/ohio-state-university-area" className="cren-action-chip">OSU Area rental checks</Link>
            <Link href="/areas/franklinton" className="cren-action-chip">Franklinton renter context</Link>
            <Link href="/housing-search#rent" className="cren-action-chip">Compare rental sources</Link>
            <Link href="/contact?subject=renter-question" className="cren-action-chip">Ask CREN</Link>
          </div>
        </section>
      </div>
    </CrenPage>
  );
}
