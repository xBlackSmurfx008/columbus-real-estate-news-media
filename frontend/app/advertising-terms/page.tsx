import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Advertising Terms",
  description: "Advertising, sponsor package, insertion order, claims, label, reporting, and refund terms for CREN.",
  alternates: { canonical: "/advertising-terms" },
};

export default function AdvertisingTermsPage() {
  return <PolicyPageShell policyKey="advertisingTerms" />;
}
