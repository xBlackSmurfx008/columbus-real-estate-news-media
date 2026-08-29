import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import {
  POLICY_LIBRARY_ORDER,
  POLICY_PAGES,
  policyPath,
  type PolicyLink,
  type PolicyPageContent,
  type PolicyPageKey,
} from "@/lib/policy-pages";

function PolicyLinkList({ links }: { links: PolicyLink[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => {
        const isInternal = link.href.startsWith("/");
        const className = "cren-action-chip";
        return isInternal ? (
          <Link key={link.href} href={link.href} className={className}>
            {link.label}
          </Link>
        ) : (
          <a key={link.href} href={link.href} className={className} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        );
      })}
    </div>
  );
}

export function PolicyPageShell({ policyKey }: { policyKey: PolicyPageKey }) {
  const policy: PolicyPageContent = POLICY_PAGES[policyKey];
  const relatedPolicies = POLICY_LIBRARY_ORDER.filter((key) => key !== policyKey).slice(0, 6);

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">{policy.eyebrow}</div>
          <h1 className="cren-heading-xl">{policy.title}</h1>
          <p className="cren-body mt-3 max-w-3xl">{policy.description}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <p className="cren-soft p-3 text-sm text-[color:var(--text-secondary)]">
              <strong>Effective date:</strong> {policy.effectiveDate}
            </p>
            <p className="cren-soft p-3 text-sm text-[color:var(--text-secondary)]">
              <strong>Review status:</strong> {policy.reviewStatus}
            </p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="cren-stack-lg">
            {policy.sections.map((section) => (
              <section key={section.title} className="cren-surface p-6 md:p-8">
                <h2 className="cren-heading-lg text-[length:1.3rem]">{section.title}</h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="cren-body mt-3 text-sm">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[color:var(--text-secondary)]">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.links && <PolicyLinkList links={section.links} />}
              </section>
            ))}
          </main>

          <aside className="cren-surface h-fit p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Policy Library</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/policies" className="cren-text-link">
                  All policies
                </Link>
              </li>
              {relatedPolicies.map((key) => (
                <li key={key}>
                  <Link href={policyPath(key)} className="cren-text-link">
                    {POLICY_PAGES[key].title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="cren-body mt-5 text-xs">
              Draft policy pages help CREN prepare for legal review. They are not a substitute for legal advice.
            </p>
          </aside>
        </div>
      </div>
    </CrenPage>
  );
}
