import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/cookies",
  title: "Cookie and Tracking Policy",
  description:
    "Cookie, analytics, affiliate redirect, and tracking policy for Columbus Real Estate News, including what is measured on this site and how to opt out of it.",
});

export default function CookiesPage() {
  return <PolicyPageShell policyKey="cookies" />;
}
