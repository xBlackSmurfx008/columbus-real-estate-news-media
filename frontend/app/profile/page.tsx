import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { ProfilePanel } from "@/components/profile-panel";
import { pageMetadata } from "@/lib/page-metadata";

// Per-visitor page: it renders the signed-in member's own account, so it has no
// public document to index. noindex, and absent from app/sitemap.ts.
export const metadata: Metadata = pageMetadata({
  path: "/profile",
  title: "Your CREN Membership Profile",
  description:
    "Manage your free Columbus Real Estate News membership: the Columbus neighborhoods you follow, the topics you care about, and your local housing preferences.",
  noindex: true,
});

type ProfilePageProps = { searchParams: Promise<{ welcome?: string }> };

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  return <CrenPage narrow><ProfilePanel welcome={params.welcome === "1"} /></CrenPage>;
}
