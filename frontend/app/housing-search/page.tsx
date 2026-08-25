import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { LeadForm } from "@/components/lead-form";
import { GUIDE_IMAGES, HOUSING_SEARCH_SOURCES } from "@/lib/area-guides";

export const metadata: Metadata = {
  title: "Search, Buy, Rent, Sell or List Columbus Housing",
  description: "Compare places to search Columbus homes and apartments, plan a sale, or advertise a rental—with verification and scam-safety checks.",
  alternates: { canonical: "/housing-search" },
};

function SourceGrid({ sources }: { sources: ReadonlyArray<{ title: string; href: string; note: string }> }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {sources.map((source) => (
        <a key={source.title} href={source.href} target="_blank" rel="noopener noreferrer" className="cren-surface cren-card-link p-5">
          <h3 className="font-semibold text-[color:var(--text-hero)]">{source.title} ↗</h3>
          <p className="cren-body mt-2 text-sm">{source.note}</p>
        </a>
      ))}
    </div>
  );
}

export default async function HousingSearchPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const selectedArea = typeof area === "string" && area.trim() ? area.trim().slice(0, 120) : "Columbus and Central Ohio";

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface overflow-hidden">
          <div className="grid md:grid-cols-[1.05fr_.95fr]">
            <div className="p-7 md:p-10">
              <div className="section-eyebrow">Housing search center</div>
              <h1 className="cren-heading-xl">Search, rent, buy, sell or list in {selectedArea}</h1>
              <p className="cren-body mt-3 max-w-2xl">
                No single portal is guaranteed to contain every current property. Compare more than one source, confirm status with the listing party, and use public records and written terms before sending money or making an offer.
              </p>
              <div className="cren-btn-row mt-6">
                <Link href="/areas" className="cren-btn cren-btn-primary">Research an area</Link>
                <Link href="/rent/find-a-home" className="cren-btn cren-btn-outline">Request rental help</Link>
              </div>
            </div>
            <div className="relative min-h-[260px] bg-[color:var(--green-pale)]">
              <Image src={GUIDE_IMAGES.housing} alt="Representative editorial image of varied Central Ohio housing" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
          <p className="border-t border-[color:var(--border)] px-7 py-3 text-xs text-[color:var(--text-muted)]">
            CREN representative editorial image; not a listing or depiction of a specific available property.
          </p>
        </section>

        <section id="buy" className="scroll-mt-36">
          <div className="section-eyebrow">Buy a home</div>
          <h2 className="cren-heading-lg">Compare active homes for sale</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">Use several portals because coverage, freshness, filters, status labels, and agent relationships differ.</p>
          <SourceGrid sources={HOUSING_SEARCH_SOURCES.buy} />
        </section>

        <section id="rent" className="scroll-mt-36">
          <div className="section-eyebrow">Rent an apartment or house</div>
          <h2 className="cren-heading-lg">Compare rentals and total monthly cost</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">Compare advertised rent plus required fees, utilities, parking, deposits, pet costs, application criteria, lease term, and renewal terms.</p>
          <SourceGrid sources={HOUSING_SEARCH_SOURCES.rent} />
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Sell or market a property</div>
          <h2 className="cren-heading-lg">Choose the correct path for the property</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Link href="/sell/your-home" className="cren-soft cren-card-link p-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Sell an owner-occupied home</h3>
              <p className="cren-body mt-2 text-sm">Compare preparation, pricing evidence, representation, likely costs, timing, and offer terms.</p>
            </Link>
            <Link href="/sell/investment-property" className="cren-soft cren-card-link p-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Sell an investment property</h3>
              <p className="cren-body mt-2 text-sm">Plan around occupancy, leases, deposits, notices, records, operations, and buyer type.</p>
            </Link>
            <Link href="/market-data" className="cren-soft cren-card-link p-5">
              <h3 className="font-semibold text-[color:var(--text-hero)]">Review sourced market context</h3>
              <p className="cren-body mt-2 text-sm">Use observations with geography, property type, period, and source attached.</p>
            </Link>
          </div>
        </section>

        <section id="list-a-rental" className="scroll-mt-36">
          <div className="section-eyebrow">List a rental</div>
          <h2 className="cren-heading-lg">Advertise a rental and request CREN listing support</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">
            Review each platform&apos;s current pricing, syndication, screening, application, and fair-housing terms. A CREN request creates a private lead record; it does not automatically publish a listing.
          </p>
          <SourceGrid sources={HOUSING_SEARCH_SOURCES.list} />
          <div className="cren-surface mt-6 p-6 md:p-8">
            <h3 className="cren-heading-md">Tell CREN about the rental</h3>
            <p className="cren-body mt-2 text-sm">We will review the property, service area, availability, and the right listing or advertising path before anything appears publicly.</p>
            <LeadForm
              persona="rental_listing"
              source="housing-search-rental-listing"
              submitLabel="Request rental listing review"
              successMessage="Your rental-listing request is in the review queue. Nothing has been published automatically."
              fields={[
                { name: "property_type", label: "Property type", type: "select", options: ["Apartment", "Single-family home", "Condo", "Townhome", "Duplex or small multifamily", "Other"], required: true },
                { name: "availability", label: "Available date", placeholder: "Month, day, and year", required: true },
                { name: "monthly_price", label: "Advertised monthly rent and required fees", placeholder: "$1,500 rent + $75 required monthly fee", required: true },
                { name: "listing_details", label: "Bedrooms, bathrooms, lease term, pets, parking, utilities, accessibility, and current listing URL", type: "textarea", required: true },
              ]}
            />
          </div>
        </section>

        <section className="cren-soft p-6 md:p-8">
          <h2 className="cren-heading-lg">Rental and listing safety</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            <li className="cren-surface p-4 text-sm">Verify the address, owner or authorized manager, and contact method independently.</li>
            <li className="cren-surface p-4 text-sm">Do not wire money, buy gift cards, or pay before you can verify the unit and written agreement.</li>
            <li className="cren-surface p-4 text-sm">Compare the same address across portals for copied photos, conflicting prices, and inconsistent contacts.</li>
            <li className="cren-surface p-4 text-sm">Owners and advertisers must follow fair-housing, advertising, screening, disclosure, and local registration requirements.</li>
          </ul>
        </section>
      </div>
    </CrenPage>
  );
}
