import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Sell Your Columbus Rental or Portfolio Off-Market | Columbus Real Estate News",
  description:
    "Sell your Columbus investment property directly. As-is, tenants in place, no listing, no commission. Quiet and fast.",
};

const faqs = [
  {
    q: "Can I sell with tenants in place?",
    a: "Yes. Occupied is fine. We take over the leases. Your tenants keep their home and you skip the turnover.",
  },
  {
    q: "Why sell off-market?",
    a: "No listing means no tenant disruption, no showings, and no commission. You trade a little top-of-market price for speed, certainty, and quiet.",
  },
  {
    q: "What do you buy?",
    a: "Single-family rentals, duplexes, small multifamily, and portfolios anywhere in the Columbus metro. Any condition.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. The conversation and the offer are free. No obligation either way.",
  },
];

export default function SellInvestmentPropertyPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Sell Investment Property</div>
          <h1 className="cren-heading-xl">Exit your Columbus rental quietly. As-is, tenants and all.</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Tired landlord? Estate to settle? Ready to redeploy into something else? We buy rentals and small
            portfolios directly from owners. No listing, no showings that spook tenants, no 6% commission.
            One conversation, one offer, your decision.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Tenants stay put</h2>
            <p className="cren-body mt-2 text-sm">We buy occupied. Leases transfer. No vacancy risk, no awkward showings.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Deferred maintenance OK</h2>
            <p className="cren-body mt-2 text-sm">Sell as-is. The roof, the furnace, the unit that needs a full turn — our problem, not yours.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Close on your timeline</h2>
            <p className="cren-body mt-2 text-sm">Two weeks or two quarters. 1031 exchange timing? We can work with it.</p>
          </div>
        </div>

        <div className="cren-surface p-8">
          <h2 className="cren-heading-lg">Tell us about the property</h2>
          <p className="cren-body mt-2 max-w-2xl">You will hear from us within 1 business day.</p>
          <LeadForm
            persona="investor_seller"
            source="sell-investment-property"
            submitLabel="Start the conversation"
            fields={[
              { name: "property_address", label: "Property address (or general area for portfolios)", placeholder: "Address or neighborhood", required: true },
              {
                name: "units",
                label: "Size",
                type: "select",
                options: ["Single-family rental", "Duplex / triplex / fourplex", "5-20 units", "20+ units / portfolio"],
                required: true,
              },
              {
                name: "occupancy",
                label: "Occupancy",
                type: "select",
                options: ["Fully occupied", "Partially occupied", "Vacant"],
              },
              {
                name: "reason",
                label: "What's driving the sale?",
                type: "select",
                options: ["Ready to retire from landlording", "Redeploying capital", "Estate / inherited", "Problem property", "Other"],
              },
              { name: "price_expectation", label: "Price expectation (optional)", placeholder: "$" },
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
