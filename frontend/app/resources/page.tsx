import type { Metadata } from 'next';
import Link from "next/link";
import { RenterBuyerResources } from "@/components/sections/renter-buyer-resources";
import { CrenPage } from "@/components/cren/cren-page";
import { AffiliateBlock } from "@/components/affiliate-block";
import { pageMetadata } from "@/lib/page-metadata";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  path: "/resources",
  title: "Columbus Renting and Buying Resources",
  description:
    "Practical Columbus housing resources for budgets, move planning, renting, buying, selling, and the local market research to do before you sign anything.",
});

export default function ResourcesPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Resources</div>
          <h1 className="cren-heading-xl">Resources</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Practical entry points for budgets, readiness, and move planning. Full neighborhood and market context lives on our area hubs and market data pages.
          </p>
        </div>

        <RenterBuyerResources />

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/housing-search" className="cren-surface cren-card-link p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Search, rent, buy, sell or list</h2>
            <p className="cren-body mt-2 text-sm">Compare major housing portals, request rental help, plan a sale, or submit a rental-listing request.</p>
          </Link>
          <Link href="/directory" className="cren-surface cren-card-link p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Home services and local businesses</h2>
            <p className="cren-body mt-2 text-sm">Find service categories, food, drink, entertainment, activities, and providers by area.</p>
          </Link>
          <Link href="/things-to-do" className="cren-surface cren-card-link p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Things to do</h2>
            <p className="cren-body mt-2 text-sm">Plan daytime fun, kids activities, parks, food, arts, entertainment, and current events.</p>
          </Link>
        </section>

        <AffiliateBlock category="finance" fromPath="/resources" heading="Money tools worth a look" />

        <div className="cren-soft rounded-[var(--radius)] border border-[color:var(--border)] p-5 text-sm">
          <p className="cren-body">
            More calculators and checklists ship on a regular cadence—{" "}
            <Link href="/subscribe?source=resources-page" className="cren-text-link">
              subscribe
            </Link>{" "}
            to get notified.
          </p>
        </div>
      </div>
    </CrenPage>
  );
}
