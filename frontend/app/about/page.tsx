import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";

export default function AboutPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">About</div>
          <h1 className="cren-heading-xl">About Columbus Real Estate News</h1>
          <p className="cren-body mt-3 max-w-2xl">
            We are a Columbus-first real estate and lifestyle intelligence brand: neighborhood context, market movement, and practical
            next steps for people who live here or plan to—without turning the site into a generic national portal.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="cren-surface p-6">
            <h2 className="cren-heading-lg text-[length:1.25rem]">What we cover</h2>
            <ul className="cren-body mt-3 list-inside list-disc space-y-2 text-sm">
              <li>Market trends, inventory, and rent signals across the metro</li>
              <li>Schools, development, and policy with clear sourcing</li>
              <li>Neighborhood guides and renter/buyer education</li>
              <li>Local events and lifestyle context that shape where people want to be</li>
            </ul>
          </div>
          <div className="cren-surface p-6">
            <h2 className="cren-heading-lg text-[length:1.25rem]">How we work</h2>
            <ul className="cren-body mt-3 list-inside list-disc space-y-2 text-sm">
              <li>Area-first taxonomy: each neighborhood hub collects related reporting</li>
              <li>Topic hubs for cross-cutting themes (market, schools, development, politics, lifestyle)</li>
              <li>Repeatable story structure so you can scan fast and trust the methodology</li>
            </ul>
          </div>
        </div>

        <div className="cren-soft rounded-[var(--radius)] border border-[color:var(--border)] p-6">
          <h2 className="cren-heading-lg text-[length:1.25rem]">Editorial standards</h2>
          <p className="cren-body mt-2 text-sm">
            We prioritize accuracy on schools, data, and policy. Sponsored placements are labeled; news and guides are written for
            readers first. Questions or corrections? Use{" "}
            <Link href="/contact" className="cren-text-link">
              Contact
            </Link>
            .
          </p>
        </div>

        <div className="cren-btn-row">
          <Link href="/subscribe?source=about-page" className="cren-btn cren-btn-primary">
            Subscribe
          </Link>
          <Link href="/areas" className="cren-btn cren-btn-outline">
            Browse neighborhoods
          </Link>
          <Link href="/advertise" className="cren-btn cren-btn-outline">
            Advertise
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
