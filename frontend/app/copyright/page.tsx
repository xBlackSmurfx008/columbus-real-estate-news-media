import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/copyright",
  title: "Copyright and DMCA Policy",
  description:
    "Copyright, DMCA-style takedown, submitted content, advertiser asset, and content reuse policy for Columbus Real Estate News, and how to file a notice.",
});

export default function CopyrightPage() {
  return <PolicyPageShell policyKey="copyright" />;
}
