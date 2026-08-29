import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for Columbus Real Estate News readers, members, advertisers, profile owners, and business submitters.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <PolicyPageShell policyKey="terms" />;
}
