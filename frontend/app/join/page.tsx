import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { JoinForm } from "@/components/join-form";

export const metadata: Metadata = {
  title: "Join Free | Columbus Real Estate News",
  description:
    "Free membership: the weekly Columbus market brief, neighborhood insights, and first access to deal alerts and premium data as they launch.",
};

export default function JoinPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Membership</div>
          <h1 className="cren-heading-xl">Join free. Know Columbus real estate before everyone else.</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Membership is free — and it stays free. You get the weekly market brief, neighborhood-level
            insights, and first-in-line access to the tools we&apos;re building next: deal alerts and premium
            market data. No spam, no pressure, unsubscribe anytime.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Weekly market brief</h2>
            <p className="cren-body mt-2 text-sm">The Columbus numbers that matter, in plain English, every week.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Deal alerts (coming)</h2>
            <p className="cren-body mt-2 text-sm">Members get first access to off-market and FSBO alerts when they launch.</p>
          </div>
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Premium data (coming)</h2>
            <p className="cren-body mt-2 text-sm">Neighborhood deep-dives and investor tools. Members shape what we build.</p>
          </div>
        </div>

        <div className="cren-surface p-8">
          <h2 className="cren-heading-lg">Become a member</h2>
          <JoinForm source="join-page" />
        </div>
      </div>
    </CrenPage>
  );
}
