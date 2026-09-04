import type { Metadata } from 'next';
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/about",
  title: "About CREN and Our Columbus Coverage",
  description:
    "About Columbus Real Estate News: the newsroom, what we cover across Central Ohio, how we source and check stories, and how corrections and standards work.",
});

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
              <li>Automated research and production with deterministic evidence and image-integrity gates</li>
              <li>Repeatable story structure so readers can scan quickly and inspect the evidence</li>
            </ul>
          </div>
        </div>

        <div className="cren-soft rounded-[var(--radius)] border border-[color:var(--border)] p-6">
          <h2 className="cren-heading-lg text-[length:1.25rem]">Editorial accountability</h2>
          <p className="cren-body mt-2 text-sm">
            Read our <Link href="/editorial-standards" className="cren-text-link">editorial standards</Link>, learn how the{' '}
            <Link href="/newsroom" className="cren-text-link">CREN Newsroom</Link> works, or submit a factual challenge under our{' '}
            <Link href="/corrections" className="cren-text-link">corrections policy</Link>.
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
