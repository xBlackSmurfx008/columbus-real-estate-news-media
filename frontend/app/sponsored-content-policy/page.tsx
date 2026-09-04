import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/sponsored-content-policy",
  title: "Sponsored Content Policy",
  description:
    "Sponsored content, sponsor message, affiliate link, and native advertising disclosure policy for Columbus Real Estate News, and how each one is labeled.",
});

export default function SponsoredContentPolicyPage() {
  return <PolicyPageShell policyKey="sponsoredContent" />;
}
