import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: "Accessibility commitment, feedback path, and audit targets for Columbus Real Estate News.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return <PolicyPageShell policyKey="accessibility" />;
}
