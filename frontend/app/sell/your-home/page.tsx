import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";
import { FunnelDisclosure } from "@/components/funnel-disclosure";

export const metadata: Metadata = {
  title: "Sell Your Columbus Home Without an Agent | Columbus Real Estate News",
  description:
    "Get a no-obligation offer on your Columbus home. No 6% commission, no repairs, no showings. Local buyers, you pick the closing date.",
};

const faqs = [
  {
    q: "What does this cost me?",
    a: "Nothing. The offer is free and there is no obligation. If you say no, we part as friends and you keep getting our market updates if you want them.",
  },
  {
    q: "Do I need to fix anything first?",
    a: "No. We buy homes as-is. Leave the repairs, the cleanout, and the paint to us.",
  },
  {
    q: "How fast can this happen?",
    a: "You pick the date. Some sellers close in two weeks. Others need three months to line up their next move. Both are fine.",
  },
  {
    q: "How do I know this is legit?",
    a: "We are local Columbus investors, not a national call center. We publish this news site every day and we put our name on everything. Ask us anything on a call before you decide.",
  },
  {
    q: "What if I still owe money on the house?",
    a: "That is normal. Most homes we buy still have a mortgage. The loan gets paid off at closing, like any sale.",
  },
];

export default function SellYourHomePage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Sell Your Home</div>
          <h1 className="cren-heading-xl">Skip the 6% fee. Skip the showings. Keep your timeline.</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Selling a house is stressful. Strangers walking through your home. Repair lists. Months of waiting.
            There is a simpler way: tell us about your home, and we will bring you a real offer from local Columbus
            buyers. No commission. No repairs. No pressure.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">You keep more</h2>
            <p className="cren-body mt-2 text-sm">No agent commission. On a $300,000 home, that is roughly $18,000 that stays in your pocket.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Sell as-is</h2>
            <p className="cren-body mt-2 text-sm">No repairs, no staging, no photos day. We buy homes in any condition, in any Columbus neighborhood.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">You pick the date</h2>
            <p className="cren-body mt-2 text-sm">Close in two weeks or three months. Your move, your schedule.</p>
          </div>
        </div>

        <div className="cren-surface p-8">
          <h2 className="cren-heading-lg">Tell us about your home</h2>
          <p className="cren-body mt-2 max-w-2xl">
            Takes about two minutes. You will hear from us within 1 business day.
          </p>
          <FunnelDisclosure variant="seller" />
          <LeadForm
            persona="fsbo_seller"
            source="sell-your-home"
            submitLabel="Get my free offer"
            fields={[
              { name: "property_address", label: "Property address", placeholder: "123 Main St, Columbus, OH", required: true },
              {
                name: "property_type",
                label: "Property type",
                type: "select",
                options: ["Single-family house", "Condo / townhome", "Duplex", "Other"],
                required: true,
              },
              {
                name: "condition",
                label: "Condition (honest answers help us move faster)",
                type: "select",
                options: ["Move-in ready", "Needs some work", "Needs major work"],
              },
              {
                name: "timeline",
                label: "When do you want to sell?",
                type: "select",
                options: ["As soon as possible", "1-3 months", "3-6 months", "Just exploring"],
              },
              { name: "asking_price", label: "Price you have in mind (optional)", placeholder: "$" },
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
