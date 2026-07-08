import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Find a Rental Home or Apartment in Columbus | Columbus Real Estate News",
  description:
    "Tell us what you're looking for and your budget. We'll help match you with Columbus rentals that fit — no fees to you.",
};

const faqs = [
  {
    q: "Does this cost me anything?",
    a: "No. Helping renters find a home is free to you.",
  },
  {
    q: "What if my budget is tight?",
    a: "Tell us your real number. We would rather show you homes you can actually afford than waste your time.",
  },
  {
    q: "How fast will I hear back?",
    a: "Within 1 business day. If you need something urgently, say so on the form.",
  },
  {
    q: "Do you cover my neighborhood?",
    a: "We cover the whole Columbus metro — from downtown to the suburbs. Name the areas you want and we'll focus there.",
  },
];

export default function FindARentalPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Find a Rental</div>
          <h1 className="cren-heading-xl">Find a Columbus home that fits your life and your budget</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Apartment hunting is a grind. Endless listings, dead-end tours, places that cost more than they said.
            Tell us what you need and what you can spend. We will help you find Columbus rentals that actually fit —
            and it costs you nothing.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Free to you</h2>
            <p className="cren-body mt-2 text-sm">No fees for renters. Ever.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Your budget, respected</h2>
            <p className="cren-body mt-2 text-sm">We match to what you can spend, not what pads someone&apos;s commission.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Whole metro</h2>
            <p className="cren-body mt-2 text-sm">Downtown lofts to suburban townhomes. You pick the areas.</p>
          </div>
        </div>

        <div className="cren-surface p-8">
          <h2 className="cren-heading-lg">Tell us what you&apos;re looking for</h2>
          <p className="cren-body mt-2 max-w-2xl">You will hear from us within 1 business day.</p>
          <LeadForm
            persona="renter"
            source="find-a-home"
            submitLabel="Find my home"
            fields={[
              {
                name: "beds",
                label: "Bedrooms",
                type: "select",
                options: ["Studio", "1 bedroom", "2 bedrooms", "3 bedrooms", "4+ bedrooms"],
                required: true,
              },
              {
                name: "budget",
                label: "Monthly budget",
                type: "select",
                options: ["Under $1,000", "$1,000 - $1,500", "$1,500 - $2,000", "$2,000 - $3,000", "$3,000+"],
                required: true,
              },
              {
                name: "move_date",
                label: "When do you need to move?",
                type: "select",
                options: ["ASAP", "Within 30 days", "1-2 months", "2-3 months", "Flexible"],
              },
              { name: "must_haves", label: "Must-haves (optional)", type: "textarea", placeholder: "Pet-friendly, parking, in-unit laundry, near COTA..." },
            ]}
          />
        </div>

        <div className="cren-surface p-8">
          <h2 className="cren-heading-lg">Common questions</h2>
          <dl className="mt-4 space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-[color:var(--text-hero)]">{f.q}</dt>
                <dd className="cren-body mt-1 text-sm">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </CrenPage>
  );
}
