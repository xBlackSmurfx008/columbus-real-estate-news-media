import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import Link from "next/link";
import { JoinForm } from "@/components/join-form";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/join",
  title: "Join CREN Free and Follow Your Areas",
  description:
    "Free CREN membership with a saved profile. Follow your Columbus neighborhoods and help shape the deal alerts and market tools we are building next.",
});

export default function JoinPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Membership</div>
          <h1 className="cren-heading-xl">Join free. Know Columbus real estate before everyone else.</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Membership is free and it stays free. A member account saves your neighborhoods and your preferences,
            and puts you first in line for the tools we are building next. No spam, no pressure, leave anytime.
          </p>
          <p className="cren-body mt-2 max-w-2xl text-sm">
            Want in without a password?{" "}
            <Link href="/subscribe?source=join-page" className="cren-text-link">
              Join with your email and your area
            </Link>{" "}
            instead. It takes one step.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="cren-surface rounded-[var(--radius)] border border-[color:var(--border)] p-5">
            <h2 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">Your areas, saved</h2>
            <p className="cren-body mt-2 text-sm">Pick the Columbus neighborhoods you follow. Your profile keeps them and you can change them anytime.</p>
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
          <p className="cren-body mt-2 text-sm">
            Create a password so you can return to your profile and update your preferences. Straight answer on email:
            we have not sent a member email yet. We are building it, and you will hear from us before the first one
            goes out.
          </p>
          <JoinForm source="join-page" />
        </div>
      </div>
    </CrenPage>
  );
}
