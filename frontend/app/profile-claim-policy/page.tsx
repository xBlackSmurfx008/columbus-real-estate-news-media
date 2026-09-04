import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/profile-claim-policy",
  title: "CREN Profile Claim Policy",
  description:
    "Profile claim, authority proof, edit rights, dispute, and audit policy for the business and professional profiles on Columbus Real Estate News.",
});

export default function ProfileClaimPolicyPage() {
  return <PolicyPageShell policyKey="profileClaims" />;
}
