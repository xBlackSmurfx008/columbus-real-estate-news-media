import type { Metadata } from 'next';
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { CrenRevealInit } from "@/components/cren/cren-reveal-init";
import { HomeSections } from "@/components/cren/home-sections";
import { getPublicData } from "@/lib/public-data";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = {
  title: 'Columbus Housing, Neighborhoods & Local Living',
  description: 'Sourced local reporting and housing intelligence for Columbus renters, buyers, sellers, and residents.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  let data;
  try {
    data = await getPublicData();
  } catch {
    data = null;
  }

  return (
    <div className="cren-home">
      <AnalyticsTracker />
      <CrenRevealInit />
      <HomeSections
        articles={data?.articles ?? []}
        marketSnapshot={data?.marketSnapshot ?? []}
        neighborhoods={data?.neighborhoods ?? []}
        ads={data?.ads ?? []}
        testimonials={data?.testimonials ?? []}
        tickers={data?.tickers ?? []}
      />
    </div>
  );
}
