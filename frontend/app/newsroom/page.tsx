import type { Metadata } from 'next';
import Link from 'next/link';
import { CrenPage } from '@/components/cren/cren-page';

export const metadata: Metadata = {
  title: 'CREN Newsroom',
  description: 'How the Columbus Real Estate News newsroom researches, checks, illustrates, publishes, and corrects local reporting.',
  alternates: { canonical: '/newsroom' },
};

export default function NewsroomPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-8">
          <div className="section-eyebrow">Publisher transparency</div>
          <h1 className="cren-heading-xl">CREN Newsroom</h1>
          <p className="cren-body mt-3 max-w-3xl">
            CREN Newsroom is the organizational byline for Columbus Real Estate News. It combines structured research,
            automated production tools, and a fail-closed publication gate to cover housing and daily life across Central Ohio.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="cren-surface p-6">
            <h2 className="cren-heading-lg text-[length:1.25rem]">What automation does</h2>
            <p className="cren-body mt-2 text-sm">
              Automation helps discover public records and timely local topics, structure drafts, verify required fields,
              check reader-visible source links, prepare story-specific imagery, and publish completed packages.
            </p>
          </div>
          <div className="cren-surface p-6">
            <h2 className="cren-heading-lg text-[length:1.25rem]">What the gate requires</h2>
            <p className="cren-body mt-2 text-sm">
              A story cannot publish without complete copy, visible evidence, required local and topic context, and a reachable,
              durable hero image that passes exact and near-duplicate checks.
            </p>
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Accountability</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">
            Readers should be able to distinguish a proposal from an approval, a prediction from a measured outcome, and an
            organizer&apos;s claim from an independent record. We link evidence in the article and preserve correction context when
            a material fact changes.
          </p>
          <div className="cren-btn-row mt-5">
            <Link href="/editorial-standards" className="cren-btn cren-btn-outline">Editorial standards</Link>
            <Link href="/corrections" className="cren-btn cren-btn-outline">Corrections policy</Link>
            <Link href="/contact" className="cren-btn cren-btn-primary">Contact the newsroom</Link>
          </div>
        </section>
      </div>
    </CrenPage>
  );
}
