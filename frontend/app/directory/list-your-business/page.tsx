import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";
import { LOCAL_LIVING_CATEGORIES, SERVICE_CATEGORIES } from "@/lib/area-guides";
import { ADVERTISING_PACKAGE_OPTIONS, DIRECTORY_LISTING_FIELD_GROUPS } from "@/lib/directory-sponsorship";

export const metadata: Metadata = {
  title: "List Your Columbus-Area Business",
  description: "Submit a Columbus-area home service, restaurant, entertainment, activity, or local business for CREN directory review.",
  alternates: { canonical: "/directory/list-your-business" },
};

export default async function ListYourBusinessPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const selectedArea = typeof area === "string" && area.trim() ? area.trim().slice(0, 120) : "Columbus and Central Ohio";
  const categories = [...SERVICE_CATEGORIES, ...LOCAL_LIVING_CATEGORIES];

  return (
    <CrenPage narrow>
      <div className="cren-stack-lg">
        <section className="cren-surface p-7 md:p-9">
          <div className="section-eyebrow">Directory review</div>
          <h1 className="cren-heading-xl">List a business serving {selectedArea}</h1>
          <p className="cren-body mt-3">
            Give CREN enough information to verify the company and build a useful listing. Submission is not automatic publication or editorial endorsement. Paid placement, if selected later, is clearly labeled.
          </p>
          <LeadForm
            persona="directory_listing"
            source="directory-list-your-business"
            submitLabel="Submit business for review"
            successMessage="Your business submission is in the directory review queue. It has not been published automatically."
            fields={[
              { name: "business_name", label: "Public business name", required: true },
              { name: "legal_entity_name", label: "Legal entity name", required: true },
              { name: "category", label: "Primary category", type: "select", options: categories, required: true },
              { name: "secondary_categories", label: "Secondary categories or services", placeholder: "Optional; do not add services you cannot provide in the selected area." },
              { name: "website", label: "Website or verified public profile URL", placeholder: "https://", required: true },
              { name: "public_contact", label: "Public phone, booking link, or contact URL", required: true },
              { name: "service_areas", label: "Cities, neighborhoods, counties, or ZIP codes served", type: "textarea", placeholder: "Be specific about where customers can use the service.", required: true },
              { name: "credentials", label: "Licenses, insurance, permits, certifications, accessibility, or other verification details", type: "textarea", required: true },
              { name: "claimant_authority", label: "Your role and proof you are authorized to claim or update this listing", type: "textarea", required: true },
              { name: "limitations_exclusions", label: "Limitations, exclusions, unavailable services, or service-area boundaries", type: "textarea", required: true },
              { name: "listing_summary", label: "What the business offers, typical customer or job type, hours, price approach, and anything readers should know", type: "textarea", required: true },
              { name: "lead_routing_permission", label: "Lead-routing permission", type: "select", options: ["CREN may send relevant reader inquiries to us with sponsor disclosure", "Contact us before routing any reader inquiry", "Do not route reader inquiries; listing contact only"], required: true },
              { name: "dispute_contact", label: "Dispute, correction, or complaint contact", placeholder: "Name, email, and phone for CREN operations", required: true },
              { name: "placement_interest", label: "Listing or sponsorship interest", type: "select", options: [...ADVERTISING_PACKAGE_OPTIONS], required: true },
            ]}
          />
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Listing fields</div>
          <h2 className="cren-heading-md">Claim and publication record</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {DIRECTORY_LISTING_FIELD_GROUPS.map((group) => (
              <article key={group.group} className="cren-soft p-4">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{group.group}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                  {group.fields.map((field) => <li key={field.label}>{field.label}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="cren-heading-md">What CREN checks before publication</h2>
            <Link href="/directory/sponsor-rules" className="cren-text-link text-sm font-semibold">Sponsor rules</Link>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[color:var(--text-secondary)]">
            <li>Business identity, working website or public profile, and contact details.</li>
            <li>Service area and category claims that match what customers can actually request.</li>
            <li>Credentials and disclosures appropriate to regulated or higher-risk work.</li>
            <li>No discriminatory, deceptive, unsupported superlative, or pay-for-editorial language.</li>
            <li>Clear separation among basic listings, sponsored placement, advertising, and newsroom coverage.</li>
          </ul>
        </section>
      </div>
    </CrenPage>
  );
}
