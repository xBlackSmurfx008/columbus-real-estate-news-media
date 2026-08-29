import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Fair Housing Policy",
  description: "Fair housing and equal opportunity policy for CREN housing ads, profiles, routes, listings, and content.",
  alternates: { canonical: "/fair-housing" },
};

export default function FairHousingPolicyPage() {
  return <PolicyPageShell policyKey="fairHousing" />;
}
