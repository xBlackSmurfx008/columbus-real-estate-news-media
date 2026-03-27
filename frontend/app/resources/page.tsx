import Link from "next/link";
import { RenterBuyerResources } from "@/components/sections/renter-buyer-resources";
import { CrenPage } from "@/components/cren/cren-page";

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
