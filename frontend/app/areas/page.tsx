import type { Metadata } from 'next';
import { AreaCard } from "@/components/cards";
import { AREA_SECTION_ORDER, AREA_SECTION_LABELS } from "@/lib/franklin-areas";
import { areasGroupedBySection } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { getArticles } from "@/lib/public-data";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/areas",
  title: "Columbus Neighborhood & Area Guides",
  description:
    "Explore housing, development, schools, restaurants, events, and sourced market reporting across Columbus neighborhoods, suburbs, and Franklin County hubs.",
});

export default async function AreasPage() {
  const grouped = areasGroupedBySection();
  const areaImages = new Map<string, string>();
  try {
    const articles = await getArticles();
    for (const article of articles) {
      if (article.area_slug && article.image_url && !areaImages.has(article.area_slug)) {
        areaImages.set(article.area_slug, article.image_url);
      }
    }
  } catch {
    // The representative editorial image registry keeps every card complete.
  }

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Explore</div>
          <h1 className="cren-heading-xl">Neighborhood hubs</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Franklin County places and Columbus neighborhoods aligned with how major listing sites index the market (cities, villages, CDPs, and
            corridors). Each hub collects local context as we publish.
          </p>
        </div>

        {AREA_SECTION_ORDER.map((kind) => {
          const label = AREA_SECTION_LABELS[kind];
          const sectionAreas = grouped[label] ?? [];
          if (sectionAreas.length === 0) return null;

          return (
            <section key={kind} className="cren-surface p-6 md:p-8" data-section-id={`areas-${kind}`}>
              <h2 className="cren-heading-lg">{label}</h2>
              <p className="cren-body mt-2 text-sm">
                {kind === "neighborhood"
                  ? "Neighborhood and district names within the City of Columbus."
                  : kind === "city"
                    ? "Incorporated cities and villages in Franklin County. Several extend into adjacent counties—see each hub for notes."
                    : kind === "cdp"
                      ? "Census-designated places and other indexed names in Franklin County."
                      : kind === "corridor"
                        ? "High-intent search corridors that span municipal boundaries."
                        : "Market-wide reporting and cross-cutting stories."}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sectionAreas.map((area) => (
                  <AreaCard key={area.slug} area={area} imageUrl={areaImages.get(area.slug)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </CrenPage>
  );
}
