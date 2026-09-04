import Link from "next/link";

/**
 * Plain-English commercial disclosure for the four lead funnels.
 *
 * Every line here must stay consistent with /lead-disclosure, /privacy, and
 * /terms. Do not add a claim about compensation or about who buys a property
 * unless that claim is already established in policy. Where a fact is not
 * settled, the copy states a commitment ("we will tell you first") instead of
 * inventing a present-tense fact.
 */
export type FunnelDisclosureVariant = "seller" | "capital" | "renter";

type DisclosureItem = { term: string; detail: React.ReactNode };

const VARIANTS: Record<FunnelDisclosureVariant, DisclosureItem[]> = {
  seller: [
    {
      term: "Who reads this",
      detail: "Your request goes to the CREN team. A person here reads it and contacts you. We do not sell contact lists.",
    },
    {
      term: "Who may buy your property",
      detail:
        "We may. This site is published by Columbus Real Estate News LLC, and the same owners buy Columbus real estate. If you get an offer from us, we are the buyer. We are not your agent, your broker, or your adviser.",
    },
    {
      term: "How we get paid",
      detail:
        "You pay us nothing and there is no commission. We make our money as a buyer, from what a property earns or sells for after we own it. If we ever hand your request to another buyer, agent, or partner who pays us, we will tell you before we do it.",
    },
  ],
  capital: [
    {
      term: "Who reads this",
      detail: "The owner of CREN, and nobody else. Capital notes are not routed to partners, sponsors, or advertisers.",
    },
    {
      term: "Who you would be working with",
      detail:
        "This site is published by Columbus Real Estate News LLC, and the same owners buy and operate Columbus real estate. A conversation is a conversation. It is not an offer, and nothing here is investment advice.",
    },
    {
      term: "How we get paid",
      detail:
        "Nothing for the conversation. If a specific deal ever comes up, any fee, split, or profit share we would earn gets written into that deal's own paperwork, in front of you and your own advisers, before you commit to anything. We never promise returns.",
    },
  ],
  renter: [
    {
      term: "Who reads this",
      detail: "Your request goes to the CREN team. A person here reads it and contacts you. We do not sell contact lists.",
    },
    {
      term: "Whose homes you may see",
      detail:
        "This site is published by Columbus Real Estate News LLC, and the same owners own Columbus rental property. If a home we own or manage fits what you asked for, we will tell you it is ours.",
    },
    {
      term: "How we get paid",
      detail:
        "Renters pay us nothing. If a landlord, property manager, or partner ever pays us for sending a renter their way, we will say so right here before we pass your request along.",
    },
  ],
};

export function FunnelDisclosure({ variant }: { variant: FunnelDisclosureVariant }) {
  return (
    <section className="mt-6 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-4 text-sm text-[color:var(--text-secondary)]">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-hero)]">
        Straight talk before you send this
      </h2>
      <dl className="mt-3 grid gap-3">
        {VARIANTS[variant].map((item) => (
          <div key={item.term}>
            <dt className="font-semibold text-[color:var(--text-hero)]">{item.term}</dt>
            <dd className="mt-0.5">{item.detail}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-[color:var(--text-muted)]">
        CREN reporting is written independently of this page. Details:{" "}
        <Link href="/lead-disclosure" className="cren-text-link">
          Lead Disclosure Policy
        </Link>{" "}
        and{" "}
        <Link href="/editorial-standards" className="cren-text-link">
          Editorial Standards
        </Link>
        .
      </p>
    </section>
  );
}
