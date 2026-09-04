import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/lead-disclosure",
  title: "CREN Lead Disclosure Policy",
  description:
    "Lead routing, compensation disclosure, consent logging, and no-guarantee policy for every reader form on Columbus Real Estate News, in plain English.",
});

export default function LeadDisclosurePolicyPage() {
  return <PolicyPageShell policyKey="leadDisclosure" />;
}
