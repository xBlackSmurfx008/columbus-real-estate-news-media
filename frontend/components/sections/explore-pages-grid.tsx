import Link from "next/link";

const hubs: { href: string; title: string; description: string; cta: string; search?: string }[] = [
  {
    href: "/improve",
    title: "Improve it",
    description: "Homeowner hub—maintain, renovate, energy, outdoors, permits, and prep for resale with Columbus context.",
    cta: "Explore homeowner resources",
  },
  {
    href: "/areas",
    title: "Neighborhoods",
    description: "Area hubs with local demand signals, schools, and development context.",
    cta: "Browse areas",
  },
  {
    href: "/market-data",
    title: "Market data",
    description: "Weekly snapshot of prices, rent, days on market, and new listings.",
    cta: "View snapshot",
  },
  {
    href: "/blog",
    title: "Stories & guides",
    description: "Data briefs, neighborhood reporting, and practical renter and buyer guidance.",
    cta: "Read the blog",
  },
  {
    href: "/resources",
    title: "Resources",
    description: "Rent budget framing, buyer readiness, and move planning—on dedicated pages.",
    cta: "Open resources",
  },
  {
    href: "/subscribe",
    search: "?source=home-explore",
    title: "Newsletter",
    description: "Weekly Columbus brief by area and topic. One email, clear next steps.",
    cta: "Subscribe",
  },
  {
    href: "/advertise",
    title: "Advertise",
    description: "Neighborhood and topic sponsorships built for local measurable outcomes.",
    cta: "See packages",
  },
  {
    href: "/about",
    title: "About",
    description: "Mission, coverage areas, editorial standards, and how ColumbusREMedia fits the local market.",
    cta: "Read about us",
  },
];

export function ExplorePagesGrid() {
  return (
    <section data-section-id="explore-hubs" className="space-y-4">
      <div>
        <h2 className="cren-heading-lg">Explore Columbus</h2>
        <p className="cren-body mt-2 max-w-2xl">
          Each topic below has its own page—so you can bookmark, share, and return without scrolling through everything at once.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hubs.map((hub) => {
          const href = hub.search ? `${hub.href}${hub.search}` : hub.href;
          return (
            <Link
              key={hub.href}
              href={href}
              className="cren-surface cren-card-link flex flex-col rounded-[var(--radius)] border border-[color:var(--border)] p-5"
            >
              <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">{hub.title}</h3>
              <p className="cren-body mt-2 flex-1 text-sm">{hub.description}</p>
              <p className="cren-text-link mt-4 text-sm font-semibold">{hub.cta}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
