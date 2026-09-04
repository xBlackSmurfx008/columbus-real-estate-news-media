import type { Metadata } from 'next';
import Link from 'next/link';
import { CrenPage } from '@/components/cren/cren-page';
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/editorial-standards",
  title: "CREN Editorial Standards",
  description:
    "The sourcing, data, automation, image, independence, and correction standards Columbus Real Estate News applies to every story before it can be published.",
});

const standards = [
  ['Evidence first', 'We prefer originating public records, official datasets, agendas, filings, permits, and named primary sources. Secondary reporting is attributed and linked.'],
  ['Precise status', 'Proposed, authorized, financed, permitted, under construction, open, and completed are different states. Headlines and copy must preserve those differences.'],
  ['Comparable data', 'Housing and rent figures need a defined geography, time period, metric, and source. We do not combine unlike measures as if they were one series.'],
  ['No unsupported effects', 'A restaurant, school, event, or project does not prove a change in home values, rent, demand, or neighborhood quality without relevant evidence.'],
  ['Automation disclosure', 'Automated tools may assist research, drafting, checks, imagery, and delivery. Publication still depends on deterministic quality and image-integrity requirements.'],
  ['Commercial separation', 'Paid placements and affiliate relationships are labeled. Advertising does not authorize claims inside independent coverage.'],
];

export default function EditorialStandardsPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-8">
          <div className="section-eyebrow">How we publish</div>
          <h1 className="cren-heading-xl">Editorial Standards</h1>
          <p className="cren-body mt-3 max-w-3xl">The rules below apply to CREN reporting, data pages, guides, and automated newsroom production.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {standards.map(([title, copy]) => (
            <section key={title} className="cren-surface p-6">
              <h2 className="cren-heading-lg text-[length:1.2rem]">{title}</h2>
              <p className="cren-body mt-2 text-sm">{copy}</p>
            </section>
          ))}
        </div>
        <section className="cren-soft rounded-[var(--radius)] border border-[color:var(--border)] p-6">
          <h2 className="cren-heading-lg text-[length:1.2rem]">Questions or challenges</h2>
          <p className="cren-body mt-2 text-sm">
            Send the article URL, disputed statement, and supporting source through our <Link href="/contact" className="cren-text-link">contact page</Link>.
            See how material changes are handled in our <Link href="/corrections" className="cren-text-link">corrections policy</Link>.
          </p>
        </section>
      </div>
    </CrenPage>
  );
}
