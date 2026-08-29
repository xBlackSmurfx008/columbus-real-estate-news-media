import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "AI and Automation Policy",
  description: "AI-assisted research, drafting, image, market data, review gate, and automation policy for CREN.",
  alternates: { canonical: "/ai-policy" },
};

export default function AiPolicyPage() {
  return <PolicyPageShell policyKey="aiPolicy" />;
}
