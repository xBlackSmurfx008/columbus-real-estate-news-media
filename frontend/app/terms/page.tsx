import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/terms",
  title: "Terms of Use for CREN Readers",
  description:
    "Terms of use for Columbus Real Estate News readers, members, advertisers, profile owners, and business submitters, including submissions and disclaimers.",
});

export default function TermsPage() {
  return <PolicyPageShell policyKey="terms" />;
}
