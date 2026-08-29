import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Cookie and Tracking Policy",
  description: "Cookie, analytics, affiliate redirect, and tracking policy for Columbus Real Estate News.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return <PolicyPageShell policyKey="cookies" />;
}
