import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Lead Disclosure Policy",
  description: "Lead routing, compensation disclosure, consent logging, and no-guarantee policy for CREN forms.",
  alternates: { canonical: "/lead-disclosure" },
};

export default function LeadDisclosurePolicyPage() {
  return <PolicyPageShell policyKey="leadDisclosure" />;
}
