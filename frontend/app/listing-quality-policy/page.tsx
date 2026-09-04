import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/listing-quality-policy",
  title: "Listing and Directory Quality",
  description:
    "Quality, verification, freshness, dispute, and no-endorsement policy for the listings and directory profiles published on Columbus Real Estate News.",
});

export default function ListingQualityPolicyPage() {
  return <PolicyPageShell policyKey="listingQuality" />;
}
