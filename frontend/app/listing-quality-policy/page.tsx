import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Listing and Directory Quality Policy",
  description: "Quality, verification, freshness, dispute, and no-endorsement policy for CREN listings and directory profiles.",
  alternates: { canonical: "/listing-quality-policy" },
};

export default function ListingQualityPolicyPage() {
  return <PolicyPageShell policyKey="listingQuality" />;
}
