import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { ProfilePanel } from "@/components/profile-panel";

export const metadata: Metadata = {
  title: "My Profile | Columbus Real Estate News",
  description: "Manage your CREN membership profile and local housing preferences.",
};

type ProfilePageProps = { searchParams: Promise<{ welcome?: string }> };

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  return <CrenPage narrow><ProfilePanel welcome={params.welcome === "1"} /></CrenPage>;
}
