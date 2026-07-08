import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";

const cardClass = "cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5";

export default function RentPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Rent</div>
          <h1 className="cren-heading-xl">Rent with better local context</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Discover neighborhoods, rental pricing shifts, and practical renter guidance in one workflow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/rent/find-a-home" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Find a rental — free help</h2>
            <p className="cren-body mt-2 text-sm">Tell us your budget and must-haves. We&apos;ll match you with Columbus rentals that fit. No fees to you.</p>
          </Link>
          <Link href="/blog/columbus-rent-trends-march-2026" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Latest rent trends</h2>
            <p className="cren-body mt-2 text-sm">Read a weekly brief on concessions, pricing, and renter demand by area.</p>
          </Link>
          <Link href="/areas" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Neighborhood hub finder</h2>
            <p className="cren-body mt-2 text-sm">Compare top Columbus neighborhoods by demand profile and local context.</p>
          </Link>
          <Link href="/subscribe?source=rent-page" className={cardClass}>
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Renter tips and alerts</h2>
            <p className="cren-body mt-2 text-sm">Get practical tips, area updates, and weekly market shifts by email.</p>
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
