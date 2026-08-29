import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Copyright and DMCA Policy",
  description: "Copyright, DMCA-style takedown, submitted content, advertiser asset, and content reuse policy for CREN.",
  alternates: { canonical: "/copyright" },
};

export default function CopyrightPage() {
  return <PolicyPageShell policyKey="copyright" />;
}
