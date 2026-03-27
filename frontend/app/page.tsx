import { AnalyticsTracker } from "@/components/analytics-tracker";
import { CrenRevealInit } from "@/components/cren/cren-reveal-init";
import { HomeSections } from "@/components/cren/home-sections";
import { JourneyBar } from "@/components/cren/journey-bar";
import { getPublicData } from "@/lib/public-data";

export const revalidate = 300; // ISR: revalidate every 5 minutes

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
      <JourneyBar />
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
