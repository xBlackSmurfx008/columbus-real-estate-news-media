import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/ai-policy",
  title: "CREN AI and Automation Policy",
  description:
    "AI-assisted research, drafting, image, market data, review workflow, and automation policy for Columbus Real Estate News, and what a human still decides.",
});

export default function AiPolicyPage() {
  return <PolicyPageShell policyKey="aiPolicy" />;
}
