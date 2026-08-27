import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";
import { LOCAL_LIVING_CATEGORIES, SERVICE_CATEGORIES } from "@/lib/area-guides";

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
              { name: "business_name", label: "Legal or public business name", required: true },
              { name: "category", label: "Primary category", type: "select", options: categories, required: true },
              { name: "website", label: "Website or verified public profile URL", placeholder: "https://", required: true },
              { name: "service_areas", label: "Cities, neighborhoods, counties, or ZIP codes served", type: "textarea", placeholder: "Be specific about where customers can use the service.", required: true },
              { name: "credentials", label: "Licenses, insurance, permits, certifications, accessibility, or other verification details", type: "textarea", required: true },
              { name: "listing_summary", label: "What the business offers, typical customer, hours, price approach, and anything readers should know", type: "textarea", required: true },
              { name: "placement_interest", label: "Listing interest", type: "select", options: ["Free basic listing review", "Enhanced paid listing information", "Area or category sponsorship information", "Not sure—explain the options"], required: true },
            ]}
          />
        </section>

        <section className="cren-soft p-6">
          <h2 className="cren-heading-md">What CREN checks before publication</h2>
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
