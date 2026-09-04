import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { SPONSOR_SAFE_SERVICE_RULES } from "@/lib/consumer-insights";
import {
  DIRECTORY_CATEGORY_RULEBOOK,
  DIRECTORY_LISTING_FIELD_GROUPS,
  DIRECTORY_POLICIES,
  DIRECTORY_VERIFICATION_LABELS,
  FIRST_DIRECTORY_PILOT_PACKAGE,
  SPONSOR_PACKAGE_DEFINITIONS,
  SPONSOR_REPORTING_EXAMPLE,
} from "@/lib/directory-sponsorship";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/directory/sponsor-rules",
  title: "CREN Sponsor-Safe Service Guide Rules",
  description:
    "CREN rules for sponsored directory placement, service guides, fair-housing-safe language, disclosures, proof, lead routing, and dispute handling.",
});

const officialResources = [
  {
    label: "FTC endorsement and review guidance",
    href: "https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews",
  },
  {
    label: "HUD fair housing rights and obligations",
    href: "https://www.hud.gov/program_offices/fair_housing_equal_opp/fair_housing_rights_and_obligations",
  },
  {
    label: "Ohio Attorney General home-improvement scam guidance",
    href: "https://www.ohioattorneygeneral.gov/Media/Newsletters/Consumer-Advocate/April-2024/Watch-out-for-home-improvement-scams",
  },
  {
    label: "Columbus building and zoning permits",
    href: "https://www.columbus.gov/Business-Development/Get-a-Permit/Get-or-Track-a-Building-Permit?oc_lang=en-US",
  },
  {
    label: "Columbus contractor license and permit portal",
    href: "https://portal.columbus.gov/Permits/Welcome.aspx",
  },
] as const;

const blockedClaims = [
  ...new Set(DIRECTORY_CATEGORY_RULEBOOK.flatMap((item) => item.blockedClaims)),
].sort();

export default function SponsorRulesPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Directory governance</div>
          <h1 className="cren-heading-xl">Sponsor-safe service guide rules</h1>
          <p className="cren-body mt-3 max-w-3xl">
            CREN can monetize directory and service-guide demand only if readers can tell what is paid, what is verified, what is editorial, and what still needs independent confirmation.
          </p>
          <div className="cren-btn-row mt-6">
            <Link href="/directory/list-your-business" className="cren-btn cren-btn-primary">Submit a business</Link>
            <Link href="/advertise" className="cren-btn cren-btn-outline">Advertise with CREN</Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {SPONSOR_SAFE_SERVICE_RULES.map((rule) => (
            <article key={rule.title} className="cren-surface p-5">
              <h2 className="font-[family-name:var(--serif)] text-xl font-semibold text-[color:var(--text-hero)]">{rule.title}</h2>
              <p className="cren-body mt-2 text-sm">{rule.standard}</p>
              <p className="mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--green-pale)] p-3 text-sm text-[color:var(--text-secondary)]">
                Review check: {rule.check}
              </p>
            </article>
          ))}
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Verification labels</div>
          <h2 className="cren-heading-lg">What labels mean, and what they do not mean</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {DIRECTORY_VERIFICATION_LABELS.map((item) => (
              <article key={item.label} className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{item.label}</h3>
                <p className="cren-body mt-2 text-sm">{item.meaning}</p>
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]"><strong>Display:</strong> {item.displayRule}</p>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]"><strong>Does not mean:</strong> {item.doesNotMean}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Category rulebook</div>
          <h2 className="cren-heading-lg">Service-guide categories and launch rules</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {DIRECTORY_CATEGORY_RULEBOOK.map((item) => (
              <article key={item.category} className="cren-soft p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[color:var(--text-hero)]">{item.category}</h3>
                  <span className="cren-action-chip text-xs">{item.riskLevel} risk</span>
                </div>
                <p className="cren-body mt-2 text-sm">{item.sponsorFit}</p>
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]"><strong>Pilot:</strong> {item.pilotPriority}</p>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]"><strong>Review:</strong> {item.reviewCadence}</p>
                <div className="mt-3 grid gap-3 text-sm text-[color:var(--text-secondary)]">
                  <div>
                    <strong>Required proof:</strong>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {item.requiredProof.map((proof) => <li key={proof}>{proof}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong>Allowed claims:</strong>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {item.allowedClaims.map((claim) => <li key={claim}>{claim}</li>)}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Listing and claim fields</div>
          <h2 className="cren-heading-lg">Information CREN collects before publication</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {DIRECTORY_LISTING_FIELD_GROUPS.map((group) => (
              <article key={group.group} className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{group.group}</h3>
                <ul className="mt-3 space-y-3 text-sm text-[color:var(--text-secondary)]">
                  {group.fields.map((field) => (
                    <li key={field.label}>
                      <strong>{field.label}</strong>
                      <span className="block">{field.purpose}</span>
                      <span className="mt-1 inline-block text-xs uppercase tracking-wide text-[color:var(--text-muted)]">{field.requiredFor}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Sponsor packages</div>
          <h2 className="cren-heading-lg">Defined inventory with editorial boundaries</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SPONSOR_PACKAGE_DEFINITIONS.map((item) => (
              <article key={item.name} className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{item.name}</h3>
                <p className="mt-1 text-sm font-semibold text-[color:var(--green)]">{item.price} / {item.term}</p>
                <p className="cren-body mt-2 text-sm">{item.bestFor}</p>
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]"><strong>Labels:</strong> {item.labels.join(", ")}</p>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]"><strong>Reporting:</strong> {item.reporting.join(", ")}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                  {item.boundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">First pilot package</div>
          <h2 className="cren-heading-lg">{FIRST_DIRECTORY_PILOT_PACKAGE.name}</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">{FIRST_DIRECTORY_PILOT_PACKAGE.readerJob}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="cren-soft p-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Pilot terms</h3>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]"><strong>Category:</strong> {FIRST_DIRECTORY_PILOT_PACKAGE.category}</p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]"><strong>Area:</strong> {FIRST_DIRECTORY_PILOT_PACKAGE.area}</p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]"><strong>Term:</strong> {FIRST_DIRECTORY_PILOT_PACKAGE.term}</p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]"><strong>Rate:</strong> {FIRST_DIRECTORY_PILOT_PACKAGE.rate}</p>
            </div>
            <div className="cren-soft p-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Launch criteria</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                {FIRST_DIRECTORY_PILOT_PACKAGE.launchCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Operating policies</div>
          <h2 className="cren-heading-lg">Ranking, claims, disputes, removal, and refunds</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {DIRECTORY_POLICIES.map((policy) => (
              <article key={policy.title} className="cren-soft p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{policy.title}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                  {policy.rules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Reporting example</div>
          <h2 className="cren-heading-lg">{SPONSOR_REPORTING_EXAMPLE.flight}</h2>
          <p className="cren-body mt-2 text-sm">{SPONSOR_REPORTING_EXAMPLE.sponsor}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="cren-soft p-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Placements</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                {SPONSOR_REPORTING_EXAMPLE.placements.map((placement) => <li key={placement}>{placement}</li>)}
              </ul>
            </div>
            <div className="cren-soft p-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Metrics</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                {SPONSOR_REPORTING_EXAMPLE.metrics.map((metric) => <li key={metric}>{metric}</li>)}
              </ul>
            </div>
          </div>
          <p className="cren-body mt-4 text-sm">{SPONSOR_REPORTING_EXAMPLE.note}</p>
          <p className="cren-body mt-2 text-sm"><strong>Renewal:</strong> {SPONSOR_REPORTING_EXAMPLE.renewalRecommendation}</p>
        </section>

        <section className="cren-soft p-6 md:p-8">
          <div className="section-eyebrow">Blocked copy</div>
          <h2 className="cren-heading-lg">Claims to reject before directory monetization</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {blockedClaims.map((claim) => (
              <span key={claim} className="cren-action-chip">{claim}</span>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Official verification links</div>
          <h2 className="cren-heading-lg">References for review and reader safety</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {officialResources.map((resource) => (
              <a key={resource.href} href={resource.href} target="_blank" rel="noopener noreferrer" className="cren-soft cren-card-link p-4">
                <span className="font-semibold text-[color:var(--text-hero)]">{resource.label}</span>
                <span className="cren-text-link mt-2 block text-sm">Open official resource</span>
              </a>
            ))}
          </div>
        </section>

        <section className="cren-soft p-6 md:p-8">
          <h2 className="cren-heading-lg">Operating rule</h2>
          <p className="cren-body mt-2 text-sm">
            A directory listing can be useful without being endorsed. A sponsor can be visible without controlling editorial judgment. CREN should refuse categories, claims, targeting, or testimonials that cannot be reviewed under these rules.
          </p>
          <Link href="/corrections" className="cren-text-link mt-4 inline-block text-sm font-semibold">
            Report an inaccurate listing or disclosure issue
          </Link>
        </section>
      </div>
    </CrenPage>
  );
}
