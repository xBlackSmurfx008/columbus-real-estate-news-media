import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/fair-housing",
  title: "CREN Fair Housing Policy",
  description:
    "Fair housing and equal opportunity policy for Columbus Real Estate News housing ads, profiles, lead routes, listings, and editorial content.",
});

export default function FairHousingPolicyPage() {
  return <PolicyPageShell policyKey="fairHousing" />;
}
