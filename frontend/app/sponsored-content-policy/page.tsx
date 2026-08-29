import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Sponsored Content Policy",
  description: "Sponsored content, sponsor message, affiliate, and native advertising disclosure policy for CREN.",
  alternates: { canonical: "/sponsored-content-policy" },
};

export default function SponsoredContentPolicyPage() {
  return <PolicyPageShell policyKey="sponsoredContent" />;
}
