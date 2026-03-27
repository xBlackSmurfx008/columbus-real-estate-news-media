import Link from "next/link";

const resources = [
  {
    href: "/rent",
    title: "Rent affordability calculator",
    description: "Estimate target budget by income and area.",
  },
  {
    href: "/buy",
    title: "Buyer readiness checklist",
    description: "Track financing, timing, and neighborhood fit.",
  },
  {
    href: "/blog",
    title: "Moving timeline planner",
    description: "Plan major steps from search to move-in.",
  },
] as const;

export function RenterBuyerResources() {
  return (
    <section data-section-id="resources-row" className="cren-surface p-6 md:p-8">
      <h2 className="cren-heading-lg md:text-[1.75rem]">Renter &amp; buyer resources</h2>
      <p className="cren-body mt-2 text-sm">Practical utilities designed for quick decisions.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {resources.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="cren-card-link cren-soft block rounded-[var(--radius)] border border-[color:var(--border)] p-4"
          >
            <h3 className="font-[family-name:var(--serif)] text-base font-semibold text-[color:var(--text-hero)]">{item.title}</h3>
            <p className="cren-body mt-1 text-sm">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
