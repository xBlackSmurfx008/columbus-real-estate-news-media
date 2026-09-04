import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/submissions-policy",
  title: "CREN Submissions and Tips",
  description:
    "Submission, tip, correction, photo, listing, profile, and source-safety policy for Columbus Real Estate News, including how we handle confidential tips.",
});

export default function SubmissionsPolicyPage() {
  return <PolicyPageShell policyKey="submissions" />;
}
