import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "CREN Privacy Policy",
  description:
    "Privacy policy for Columbus Real Estate News readers, members, advertisers, and profile owners: what we collect, why, who sees it, and the choices you have.",
});

export default function PrivacyPage() {
  return <PolicyPageShell policyKey="privacy" />;
}
