import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/communications-policy",
  title: "CREN Communications Policy",
  description:
    "Email, newsletter, phone, SMS, lead follow-up, internal notification, and opt-out policy for Columbus Real Estate News: what we send, and how to stop it.",
});

export default function CommunicationsPolicyPage() {
  return <PolicyPageShell policyKey="communications" />;
}
