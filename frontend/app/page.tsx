import type { Metadata } from 'next';
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { HomeSections } from "@/components/cren/home-sections";
import { getCanonicalMarketData, selectHeadlineMetrics } from "@/lib/market-data";
import { getPublicData } from "@/lib/public-data";
import { pageMetadata } from "@/lib/page-metadata";
import { publisherGraph } from "@/lib/publisher-schema";
import { safeJsonLd } from "@/lib/site";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = pageMetadata({
  path: '/',
  title: 'Columbus Housing, Neighborhoods & Local Living',
  description:
    'Sourced local reporting and housing intelligence for Columbus renters, buyers, sellers, and residents, from a newsroom that reads the records itself.',
});

export default async function HomePage() {
  let data;
  try {
    data = await getPublicData();
  } catch {
    data = null;
  }

  // The stat bar is derived from the canonical market set — never from
  // hero_stats, which used to be a second, hand-maintained copy of the
  // same four numbers and drifted from the database.
  const marketSet = await getCanonicalMarketData();
  const headlineMetrics = selectHeadlineMetrics(marketSet, 4);

  return (
    <div className="cren-home">
      {/* Publisher identity for the site itself — see lib/publisher-schema.ts. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(publisherGraph()) }}
      />
      <AnalyticsTracker />
      <HomeSections
        articles={data?.articles ?? []}
        marketMetrics={headlineMetrics}
        neighborhoods={data?.neighborhoods ?? []}
        ads={data?.ads ?? []}
      />
    </div>
  );
}
