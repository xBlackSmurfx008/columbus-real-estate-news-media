import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Columbus Real Estate News readers, members, advertisers, and profile owners.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PolicyPageShell policyKey="privacy" />;
}
