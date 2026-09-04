import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";
import { FunnelDisclosure } from "@/components/funnel-disclosure";

export const metadata: Metadata = {
  title: "Deploy Capital in Columbus Real Estate | Columbus Real Estate News",
  description:
    "Have capital to put to work in Central Ohio real estate? Tell us your goals and we'll start a conversation about local opportunities.",
};

const faqs = [
  {
    q: "What kind of deals are these?",
    a: "Local Columbus real estate — rentals, small multifamily, value-add, and development. We focus on Central Ohio because we live and work here.",
  },
  {
    q: "Do I need to be an expert?",
    a: "No. Some partners are hands-on operators. Others just want their money working in real estate without managing anything. We start by learning what you want.",
  },
  {
    q: "How much do I need?",
    a: "It depends on the deal. Tell us your range on the form and we'll be honest about what fits.",
  },
  {
    q: "Is this a sales pitch?",
    a: "No. First step is a conversation, not a contract. We explain how we work, you decide if it fits, no pressure either way.",
  },
];

export default function DeployCapitalPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Deploy Capital</div>
          <h1 className="cren-heading-xl">Put your capital to work in Columbus real estate</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Columbus is one of the fastest-growing metros in the Midwest. If you have capital ready to deploy and
            want it working in local real estate, let&apos;s talk. We connect capital with real Central Ohio
            opportunities — and we start by understanding what you actually want.
          </p>
          <p className="mt-4 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-xs text-[color:var(--text-muted)]">
            This page is educational and is not an offer to sell or a solicitation to buy any security. Any specific
            opportunity is discussed one-on-one and may be limited to qualified investors. We never promise returns.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Local focus</h2>
            <p className="cren-body mt-2 text-sm">We only do Central Ohio. We know the neighborhoods block by block.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Your level of involvement</h2>
            <p className="cren-body mt-2 text-sm">Hands-on or hands-off. We build the conversation around your goals.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Straight talk</h2>
            <p className="cren-body mt-2 text-sm">We tell you what fits and what doesn&apos;t. No hype, no promises we can&apos;t keep.</p>
          </div>
        </div>

        <div className="cren-surface p-8">
          <h2 className="cren-heading-lg">Let&apos;s start a conversation</h2>
          <p className="cren-body mt-2 max-w-2xl">You will hear from us within 1 business day.</p>
          <FunnelDisclosure variant="capital" />
          <LeadForm
            persona="capital_partner"
            source="deploy-capital"
            submitLabel="Start the conversation"
            fields={[
              {
                name: "capital_range",
                label: "Capital you're looking to deploy",
                type: "select",
                options: ["Under $50k", "$50k - $150k", "$150k - $500k", "$500k - $1M", "$1M+"],
                required: true,
              },
              {
                name: "experience",
                label: "Your real estate experience",
                type: "select",
                options: ["New to real estate investing", "Some experience", "Experienced investor"],
              },
              {
                name: "involvement",
                label: "How involved do you want to be?",
                type: "select",
                options: ["Fully passive", "Somewhat involved", "Hands-on operator"],
              },
              {
                name: "timeline",
                label: "Timeline to deploy",
                type: "select",
                options: ["Ready now", "1-3 months", "3-6 months", "Just exploring"],
              },
              { name: "goals", label: "What are you hoping to achieve? (optional)", type: "textarea", placeholder: "Cash flow, long-term growth, diversification..." },
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
