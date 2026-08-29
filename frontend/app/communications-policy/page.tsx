import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Communications Policy",
  description: "Email, newsletter, phone, SMS, lead follow-up, internal notification, and opt-out policy for CREN.",
  alternates: { canonical: "/communications-policy" },
};

export default function CommunicationsPolicyPage() {
  return <PolicyPageShell policyKey="communications" />;
}
