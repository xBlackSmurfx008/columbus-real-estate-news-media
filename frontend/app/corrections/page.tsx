import type { Metadata } from 'next';
import Link from 'next/link';
import { CrenPage } from '@/components/cren/cren-page';

export const metadata: Metadata = {
  title: 'Corrections Policy',
  description: 'How Columbus Real Estate News receives, verifies, records, and publishes corrections and clarifications.',
  alternates: { canonical: '/corrections' },
};

export default function CorrectionsPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-8">
          <div className="section-eyebrow">Accountability</div>
          <h1 className="cren-heading-xl">Corrections Policy</h1>
          <p className="cren-body mt-3 max-w-3xl">We correct material errors promptly and keep the article URL stable so readers and search engines reach the repaired record.</p>
        </header>
        <section className="cren-surface p-6 md:p-8">
          <ol className="cren-body list-decimal space-y-4 pl-5 text-sm">
            <li><strong>Report it:</strong> send the article URL, the disputed text, and a source supporting the requested change.</li>
            <li><strong>Verify it:</strong> the newsroom checks the claim against originating records and contacts relevant parties when needed.</li>
            <li><strong>Repair it:</strong> material errors are corrected in the headline or body. Clarifications distinguish incomplete wording from a factual mistake.</li>
            <li><strong>Preserve it:</strong> the canonical URL remains stable. Historical headline URLs redirect to the corrected article rather than disappearing.</li>
          </ol>
          <Link href="/contact?subject=correction" className="cren-btn cren-btn-primary mt-6 inline-flex">Request a correction</Link>
        </section>
      </div>
    </CrenPage>
  );
}
