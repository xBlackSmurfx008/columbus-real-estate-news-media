import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Profile Claim Policy",
  description: "Profile claim, authority proof, edit rights, dispute, and audit policy for CREN business profiles.",
  alternates: { canonical: "/profile-claim-policy" },
};

export default function ProfileClaimPolicyPage() {
  return <PolicyPageShell policyKey="profileClaims" />;
}
