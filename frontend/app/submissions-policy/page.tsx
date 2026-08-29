import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Submissions and Tips Policy",
  description: "Submission, tip, correction, photo, listing, profile, and source-safety policy for CREN.",
  alternates: { canonical: "/submissions-policy" },
};

export default function SubmissionsPolicyPage() {
  return <PolicyPageShell policyKey="submissions" />;
}
