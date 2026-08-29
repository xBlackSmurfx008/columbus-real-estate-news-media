import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { POLICY_LIBRARY_ORDER, POLICY_PAGES, policyPath } from "@/lib/policy-pages";

export const metadata: Metadata = {
  title: "Policy Library",
  description: "Owner-execution legal, privacy, advertising, editorial, profile, lead-routing, and automation policies for Columbus Real Estate News.",
  alternates: { canonical: "/policies" },
};

export default function PoliciesPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Legal and policy library</div>
          <h1 className="cren-heading-xl">CREN policies</h1>
          <p className="cren-body mt-3 max-w-3xl">
            Operating policies for readers, members, advertisers, sponsors, profile owners, directory participants, and newsroom automation. These are the current owner-execution versions for launch operations and should not be represented as attorney approval.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {POLICY_LIBRARY_ORDER.map((key) => {
            const policy = POLICY_PAGES[key];
            return (
              <Link key={key} href={policyPath(key)} className="cren-surface cren-card-link p-5">
                <div className="section-eyebrow">{policy.eyebrow}</div>
                <h2 className="mt-2 font-[family-name:var(--serif)] text-xl font-semibold text-[color:var(--text-hero)]">
                  {policy.title}
                </h2>
                <p className="cren-body mt-2 text-sm">{policy.description}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {policy.effectiveDate}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </CrenPage>
  );
}
