import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";

const resourcePillars = [
  {
    title: "Maintain & repair",
    description: "Seasonal checklists, systems to watch (roof, HVAC, foundation), and when to call a pro vs. DIY.",
    href: "/blog",
    cta: "Browse maintenance guides",
  },
  {
    title: "Renovate & add value",
    description: "Kitchens, baths, and projects that tend to pay off in the Columbus market—with realistic budgeting context.",
    href: "/topics/development",
    cta: "See development & supply context",
  },
  {
    title: "Energy & efficiency",
    description: "Insulation, windows, electrification, and incentives that affect comfort and long-term costs.",
    href: "/resources",
    cta: "Open planning resources",
  },
  {
    title: "Outdoor & curb appeal",
    description: "Landscaping, decks, drainage, and neighborhood norms that matter when you sell or refinance.",
    href: "/areas",
    cta: "Explore by neighborhood",
  },
  {
    title: "Permits & local rules",
    description: "High-level framing on permits, zoning touchpoints, and where policy meets your project timeline.",
    href: "/topics/local-politics",
    cta: "Read policy & zoning coverage",
  },
  {
    title: "Prepare to sell later",
    description: "Pre-listing prep, documentation, and how improvements show up when buyers compare comps.",
    href: "/sell",
    cta: "Seller hub",
  },
];

const pillarCard =
  "cren-surface cren-card-link flex h-full flex-col rounded-[var(--radius)] border border-[color:var(--border)] p-5";

export default function ImprovePage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-8">
          <div className="section-eyebrow">Improve it</div>
          <h1 className="cren-heading-xl mt-2">Improve your home—Columbus homeowner resources</h1>
          <p className="cren-body mt-3 max-w-3xl text-lg">
            This is where homeowner life lives: practical guides, local context, and resources to maintain, upgrade, and protect your property—not
            just transaction content.
          </p>
          <div className="cren-btn-row mt-6">
            <Link href="/subscribe?source=improve-hub" className="cren-btn cren-btn-primary">
              Get homeowner updates
            </Link>
            <Link href="/blog" className="cren-btn cren-btn-outline">
              Latest stories
            </Link>
          </div>
        </header>

        <section aria-labelledby="improve-pillars-heading">
          <h2 id="improve-pillars-heading" className="cren-heading-lg">
            Resource pillars
          </h2>
          <p className="cren-body mt-2 max-w-2xl">
            Pick a lane that matches your project. We add Columbus-relevant angles as we publish—bookmark this hub and subscribe for new drops.
          </p>
          <ul className="mt-6 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {resourcePillars.map((item) => (
              <li key={item.title}>
                <Link href={item.href} className={pillarCard}>
                  <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">{item.title}</h3>
                  <p className="cren-body mt-2 flex-1 text-sm">{item.description}</p>
                  <span className="cren-text-link mt-4 text-sm font-semibold">{item.cta}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="cren-soft rounded-[var(--radius)] border border-[color:var(--border)] p-6 md:p-8" aria-labelledby="improve-trust-heading">
          <h2 id="improve-trust-heading" className="cren-heading-lg">
            Editorial standards for home content
          </h2>
          <ul className="cren-body mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>We separate general how-to from Columbus-specific notes (permits, climate, typical contractor timelines).</li>
            <li>Sponsored or partner content is labeled; we do not present ads as unbiased reviews.</li>
            <li>When we cite data, we point to methodology—same bar as our market and neighborhood reporting.</li>
          </ul>
          <p className="cren-body mt-4 text-sm">
            Want your business featured as a vetted local resource?{" "}
            <Link href="/advertise" className="cren-text-link font-semibold">
              See advertise options
            </Link>
            .
          </p>
        </section>
      </div>
    </CrenPage>
  );
}
