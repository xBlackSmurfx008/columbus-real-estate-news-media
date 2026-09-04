import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/advertising-terms",
  title: "CREN Advertising Terms",
  description:
    "Advertising, sponsor package, insertion order, claims, labeling, reporting, and refund terms for campaigns running on Columbus Real Estate News.",
});

export default function AdvertisingTermsPage() {
  return <PolicyPageShell policyKey="advertisingTerms" />;
}
