import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/profiles",
  title: "CREN Business and Member Profiles",
  description:
    "Claim, update, or request review for a CREN business, apartment, professional, advertiser, or member profile, and see what proof of authority we ask for.",
});

const profilePaths = [
  {
    title: "Claim or update an existing profile",
    href: "/profiles/claim",
    action: "Open claim dashboard",
    details: "Submit authority proof, factual corrections, update requests, dispute notes, and profile-owner contact details into the review queue.",
  },
  {
    title: "Apartment community or rental",
    href: "/housing-search#list-a-rental",
    action: "Request rental listing review",
    details: "Availability, rent and fees, concessions, unit facts, manager authority, tour/apply links, and last-verified source.",
  },
  {
    title: "Business, vendor, agent, lender, or service provider",
    href: "/directory/list-your-business",
    action: "Submit or claim a listing",
    details: "Legal name, public brand, category, service areas, credentials, public contact path, proof of authority, and dispute contact.",
  },
  {
    title: "Advertiser or sponsor",
    href: "/advertise#advertising-inquiry",
    action: "Start advertiser intake",
    details: "Campaign goal, package fit, assets, landing page, proof for claims, label requirements, reporting cadence, and insertion-order terms.",
  },
  {
    title: "Reader or member",
    href: "/profile",
    action: "Update member profile",
    details: "Name, role, preferred areas, interests, newsletter preferences, saved items, consent records, and account status.",
  },
] as const;

const reviewRules = [
  "Self-service edits can update factual information, contacts, service areas, photos, links, and availability details.",
  "CREN should keep version history for profile changes and store who requested each update.",
  "Credential, ownership, legal, fair-housing, pricing, availability, ranking, guarantee, and sponsored-placement claims require review before publication.",
  "Paid profile prominence must be labeled and cannot buy newsroom coverage, rankings, corrections outcomes, or editorial recommendations.",
  "Disputes, impersonation concerns, unsupported claims, stale availability, and reader-safety issues move a profile into review.",
] as const;

export default function ProfilesPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-7 md:p-10">
          <div className="section-eyebrow">Profile owner center</div>
          <h1 className="cren-heading-xl">Claim, update, or review a CREN profile</h1>
          <p className="cren-body mt-3 max-w-3xl">
            CREN supports profile workflows for apartment operators, property managers, agents, lenders, vendors, advertisers, sponsors, and members.
            Public changes should be useful to readers, proof-backed when needed, and clearly separated from paid promotion.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {profilePaths.map((item) => (
            <Link key={item.title} href={item.href} className="cren-surface cren-card-link p-6 no-underline">
              <div className="section-eyebrow">{item.action}</div>
              <h2 className="cren-heading-md">{item.title}</h2>
              <p className="cren-body mt-2 text-sm">{item.details}</p>
            </Link>
          ))}
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Self-service rules</div>
          <h2 className="cren-heading-lg">What profile owners can update</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {reviewRules.map((item) => (
              <li key={item} className="cren-soft p-4 text-sm text-[color:var(--text-secondary)]">{item}</li>
            ))}
          </ul>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Backend profile types</div>
          <h2 className="cren-heading-lg">Profiles CREN should maintain</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              "Reader and member profiles",
              "Apartment community profiles",
              "Property manager and landlord profiles",
              "Agent and brokerage profiles",
              "Developer and builder profiles",
              "Vendor and home-service profiles",
              "Advertiser and campaign profiles",
              "Claim, dispute, credential, and audit records",
              "Lead-recipient and lead-routing records",
            ].map((item) => (
              <div key={item} className="cren-soft p-4 text-sm font-semibold text-[color:var(--text-hero)]">{item}</div>
            ))}
          </div>
        </section>
      </div>
    </CrenPage>
  );
}
