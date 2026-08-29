import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { GUIDE_IMAGES, LOCAL_LIVING_CATEGORIES, SERVICE_CATEGORIES } from "@/lib/area-guides";
import { DIRECTORY_VERIFICATION_LABELS, FIRST_DIRECTORY_PILOT_PACKAGE } from "@/lib/directory-sponsorship";

export const metadata: Metadata = {
  title: "Columbus Local Business & Home Services Directory",
  description: "Find Columbus-area home services, food, drink, entertainment, family activities, and local businesses—or submit a company for review.",
  alternates: { canonical: "/directory" },
};

function mapsSearch(category: string, area: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${category} near ${area}, Ohio`)}`;
}

function CategoryGrid({ categories, area }: { categories: readonly string[]; area: string }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => (
        <a key={category} href={mapsSearch(category, area)} target="_blank" rel="noopener noreferrer" className="cren-surface cren-card-link p-5">
          <h3 className="font-semibold leading-snug text-[color:var(--text-hero)]">{category}</h3>
          <p className="cren-body mt-2 text-sm">Open current map results for {area}. Verify details with the provider.</p>
          <span className="cren-text-link mt-3 inline-block text-sm">Search current results ↗</span>
        </a>
      ))}
    </div>
  );
}

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const selectedArea = typeof area === "string" && area.trim() ? area.trim().slice(0, 120) : "Columbus";

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface overflow-hidden">
          <div className="grid md:grid-cols-[1.05fr_.95fr]">
            <div className="p-7 md:p-10">
              <div className="section-eyebrow">Local directory</div>
              <h1 className="cren-heading-xl">Find services and local hot spots serving {selectedArea}</h1>
              <p className="cren-body mt-3 max-w-2xl">
                Start with home-service and local-living categories, then verify the provider&apos;s current service area, credentials, hours, price, scope, and reputation. CREN does not treat inclusion as an endorsement.
              </p>
              <div className="cren-btn-row mt-6">
                <Link href={`/directory/list-your-business?area=${encodeURIComponent(selectedArea)}`} className="cren-btn cren-btn-primary">List your business</Link>
                <Link href="/areas" className="cren-btn cren-btn-outline">Choose another area</Link>
                <Link href="/directory/sponsor-rules" className="cren-btn cren-btn-outline">Sponsor rules</Link>
              </div>
            </div>
            <div className="relative min-h-[260px] bg-[color:var(--green-pale)]">
              <Image src={GUIDE_IMAGES.services} alt="Representative editorial image of local home-service professionals" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
          <p className="border-t border-[color:var(--border)] px-7 py-3 text-xs text-[color:var(--text-muted)]">CREN representative editorial image; not an endorsement or depiction of a listed company.</p>
        </section>

        <section id="home-services" className="scroll-mt-36">
          <div className="section-eyebrow">Own, rent, move or improve</div>
          <h2 className="cren-heading-lg">Home and property services</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">Request written scope and pricing. Independently verify licensing, insurance, permits, references, warranties, and complaint history where relevant.</p>
          <CategoryGrid categories={SERVICE_CATEGORIES} area={selectedArea} />
        </section>

        <section id="local-living" className="scroll-mt-36">
          <div className="section-eyebrow">Eat, drink, play and explore</div>
          <h2 className="cren-heading-lg">Local living and entertainment</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">Business hours and availability change. Use current results, then confirm details directly before making plans.</p>
          <CategoryGrid categories={LOCAL_LIVING_CATEGORIES} area={selectedArea} />
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="section-eyebrow">For local companies</div>
              <h2 className="cren-heading-lg">Create or update a directory listing</h2>
              <p className="cren-body mt-2 max-w-3xl text-sm">
                Submit your categories, service areas, website, credentials, and contact details. CREN reviews claims before publication; sponsorship or enhanced placement is labeled and cannot buy newsroom coverage.
              </p>
            </div>
            <Link href={`/directory/list-your-business?area=${encodeURIComponent(selectedArea)}`} className="cren-btn cren-btn-primary">Start a listing</Link>
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="section-eyebrow">Sponsor-safe directory</div>
              <h2 className="cren-heading-lg">Rules before monetized placement</h2>
              <p className="cren-body mt-2 max-w-3xl text-sm">
                CREN labels paid placement, verifies objective claims, keeps editorial coverage separate, and avoids housing-related language or targeting that creates fair-housing risk.
              </p>
            </div>
            <Link href="/directory/sponsor-rules" className="cren-btn cren-btn-outline">Review rules</Link>
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Verification labels</div>
          <h2 className="cren-heading-lg">Directory labels are not endorsements</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DIRECTORY_VERIFICATION_LABELS.map((item) => (
              <article key={item.label} className="cren-soft p-4">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{item.label}</h3>
                <p className="cren-body mt-2 text-sm">{item.doesNotMean}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="section-eyebrow">Pilot package</div>
              <h2 className="cren-heading-lg">{FIRST_DIRECTORY_PILOT_PACKAGE.name}</h2>
              <p className="cren-body mt-2 max-w-3xl text-sm">
                {FIRST_DIRECTORY_PILOT_PACKAGE.category} sponsorship can be tested for {FIRST_DIRECTORY_PILOT_PACKAGE.area}. It must stay labeled, proof-backed, and separate from CREN editorial judgment.
              </p>
            </div>
            <Link href="/advertise" className="cren-btn cren-btn-outline">Ask about pilot</Link>
          </div>
        </section>

        <section className="cren-soft p-6 md:p-8">
          <h2 className="cren-heading-lg">How to choose a provider</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <p className="cren-surface p-4 text-sm">Confirm the legal business name, physical or service address, and a working contact channel.</p>
            <p className="cren-surface p-4 text-sm">Ask for licensing, insurance, permits, and trade credentials appropriate to the job.</p>
            <p className="cren-surface p-4 text-sm">Get the scope, material choices, exclusions, price, schedule, payment milestones, and warranty in writing.</p>
            <p className="cren-surface p-4 text-sm">Compare multiple providers and verify independent references; directory presence alone is not a quality guarantee.</p>
          </div>
        </section>
      </div>
    </CrenPage>
  );
}
