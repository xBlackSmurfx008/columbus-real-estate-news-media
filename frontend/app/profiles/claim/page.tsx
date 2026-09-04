import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/profiles/claim",
  title: "Submit a CREN Profile Claim",
  description:
    "Submit a Columbus Real Estate News profile claim, correction, dispute, or factual update request, and we will review it against our profile claim policy.",
});

export default function ProfileClaimPage() {
  return (
    <CrenPage narrow>
      <div className="cren-stack-lg">
        <section className="cren-surface p-7 md:p-9">
          <div className="section-eyebrow">Profile claim dashboard</div>
          <h1 className="cren-heading-xl">Claim or update a CREN profile</h1>
          <p className="cren-body mt-3">
            Submit authority proof, factual updates, correction requests, and dispute notes for a business, apartment, advertiser, agent, lender,
            property manager, developer, builder, vendor, or service-provider profile. CREN stores the request in the profile review queue.
          </p>
          <LeadForm
            persona="profile_claim"
            source="profiles-claim"
            submitLabel="Submit profile claim"
            successMessage="Your profile claim or update request is in the review queue."
            fields={[
              {
                name: "profile_type",
                label: "Profile type",
                type: "select",
                options: [
                  "Apartment community",
                  "Property manager or landlord",
                  "Agent or brokerage",
                  "Lender, title, insurance, legal, or CPA",
                  "Developer or builder",
                  "Vendor or home-service provider",
                  "Advertiser or sponsor",
                  "Other",
                ],
                required: true,
              },
              { name: "existing_profile_id_or_url", label: "Existing CREN profile URL, business URL, or profile name", required: true },
              { name: "claimant_role", label: "Your role or authority", placeholder: "Owner, manager, employee, agency contact, broker, counsel, etc.", required: true },
              { name: "authority_proof", label: "Proof of authority", type: "textarea", placeholder: "Work email, official website page, public record, management agreement summary, license record, or other proof.", required: true },
              { name: "requested_updates", label: "Requested profile changes", type: "textarea", placeholder: "Only include factual updates you can support. Note fields that should stay private.", required: true },
              { name: "dispute_or_risk_notes", label: "Dispute, stale-data, credential, fair-housing, ad-label, or reader-safety notes", type: "textarea" },
            ]}
          />
        </section>

        <section className="cren-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="cren-heading-md">Review rules</h2>
            <Link href="/profile-claim-policy" className="cren-text-link text-sm font-semibold">Profile Claim Policy</Link>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[color:var(--text-secondary)]">
            <li>Submitting a claim does not automatically publish or change a profile.</li>
            <li>CREN can require proof for identity, authority, credentials, availability, prices, fees, awards, guarantees, and paid-placement claims.</li>
            <li>Paid visibility must remain labeled and cannot buy editorial coverage, rankings, corrections outcomes, or recommendations.</li>
            <li>High-risk housing, lending, insurance, legal, investment, and fair-housing-sensitive claims remain in manual review.</li>
          </ul>
        </section>
      </div>
    </CrenPage>
  );
}
