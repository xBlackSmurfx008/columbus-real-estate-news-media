import Link from "next/link";

const quickLinks = [
  { label: "Maintain & repair", href: "/blog", hint: "Guides & checklists" },
  { label: "Renovate smart", href: "/topics/development", hint: "Market context" },
  { label: "Resources & planners", href: "/resources", hint: "Budget & timing" },
  { label: "Local policy", href: "/topics/local-politics", hint: "Permits & zoning" },
];

export function ImproveItSection() {
  return (
    <section data-section-id="improve-it" className="cren-surface p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="section-eyebrow !mb-2">Improve it</p>
          <h2 className="cren-heading-lg md:text-[1.75rem]">A home for homeowners</h2>
          <p className="cren-body mt-2">
            Resources to maintain, upgrade, and protect your property—plus Columbus-specific context when it matters. Not just buying and
            selling.
          </p>
        </div>
        <Link href="/improve" className="cren-btn cren-btn-primary shrink-0 md:self-center">
          Open Improve it hub
        </Link>
      </div>
      <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="cren-soft flex flex-col rounded-[var(--radius)] border border-[color:var(--border)] p-4 transition hover:border-[color:var(--green)]"
            >
              <span className="font-semibold text-[color:var(--text-hero)]">{item.label}</span>
              <span className="cren-body mt-1 text-xs">{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
