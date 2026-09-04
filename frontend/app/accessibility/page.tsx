import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/accessibility",
  title: "CREN Accessibility Statement",
  description:
    "Accessibility commitment, feedback path, and audit targets for Columbus Real Estate News, plus how to tell us when something on the site blocks you.",
});

export default function AccessibilityPage() {
  return <PolicyPageShell policyKey="accessibility" />;
}
