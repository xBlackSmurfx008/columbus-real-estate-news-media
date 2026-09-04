import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { GuideCard } from "@/components/guide-card";
import { featuredAreas } from "@/lib/data";
import { GUIDE_IMAGES, OFFICIAL_ACTIVITY_SOURCES, type GuideCard as GuideCardData } from "@/lib/area-guides";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/things-to-do",
  title: "Things to Do in Columbus, Ohio",
  description:
    "Find daytime activities, kids programs, parks, trails, food, arts, entertainment, and current events across Columbus and Central Ohio neighborhoods.",
});

const discoveryCards: GuideCardData[] = [
  {
    eyebrow: "Free & outdoors",
    title: "Parks, trails and nature programs",
    description: "Search city and Metro Parks destinations, playgrounds, nature centers, accessible trails, programs, and seasonal closures.",
    href: "https://www.metroparks.net/parks-and-trails/",
    image: GUIDE_IMAGES.parks,
    imageAlt: "Representative editorial image of families enjoying a park",
    external: true,
  },
  {
    eyebrow: "Kids & family",
    title: "Family activities for daytime and weekends",
    description: "Start with library programs, museums, recreation centers, indoor play, nature activities, and current family-event calendars.",
    href: "https://www.experiencecolumbus.com/things-to-do/things-to-do-with-kids/",
    image: GUIDE_IMAGES.parks,
    imageAlt: "Representative editorial image of a family day out",
    external: true,
  },
  {
    eyebrow: "Eat & drink",
    title: "Neighborhood food, coffee and local hot spots",
    description: "Use area hubs to search current restaurants, bakeries, coffee, breweries, patios, markets, and late-night options near each place.",
    href: "/areas",
    image: GUIDE_IMAGES.food,
    imageAlt: "Representative editorial image of a neighborhood restaurant patio",
  },
  {
    eyebrow: "Arts & entertainment",
    title: "Museums, music, theater, sports and festivals",
    description: "Browse current events plus permanent attractions, community arts, markets, sports, and recurring annual activities.",
    href: "https://www.experiencecolumbus.com/events/?sort=date&view=list",
    image: GUIDE_IMAGES.arts,
    imageAlt: "Representative editorial image of a community arts event",
    external: true,
  },
];

const planningChecks = [
  "Confirm the event date, start time, cancellation policy, and ticket source on the organizer's site.",
  "Check age guidance, accessibility, parking or transit, weather plans, and whether registration is required.",
  "For parks, verify trail conditions, restrooms, playground status, pet rules, water access, and seasonal hours.",
  "For restaurants and venues, confirm current hours, reservation rules, cover charges, and all-ages restrictions.",
];

export default function ThingsToDoPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface overflow-hidden">
          <div className="grid md:grid-cols-[1.05fr_.95fr]">
            <div className="p-7 md:p-10">
              <div className="section-eyebrow">Columbus local living</div>
              <h1 className="cren-heading-xl">Fun things to do by neighborhood, age and time of day</h1>
              <p className="cren-body mt-3 max-w-2xl">
                Build an easy day around parks, playgrounds, library programs, family attractions, food, arts, live entertainment, sports, and seasonal events—then open an area hub for what is nearby.
              </p>
              <div className="cren-btn-row mt-6">
                <Link href="/areas" className="cren-btn cren-btn-primary">Choose an area</Link>
                <a href="https://www.experiencecolumbus.com/events/?sort=date&view=list" target="_blank" rel="noopener noreferrer" className="cren-btn cren-btn-outline">See current events ↗</a>
              </div>
            </div>
            <div className="relative min-h-[260px] bg-[color:var(--green-pale)]">
              <Image src={GUIDE_IMAGES.parks} alt="Representative editorial image of a Central Ohio park and family activity" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
          <p className="border-t border-[color:var(--border)] px-7 py-3 text-xs text-[color:var(--text-muted)]">
            CREN representative editorial image; not documentary photography of a named venue.
          </p>
        </section>

        <section>
          <div className="mb-5 max-w-3xl">
            <div className="section-eyebrow">Start with the kind of day you want</div>
            <h2 className="cren-heading-lg">Explore daytime, family and local-living categories</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {discoveryCards.map((card) => <GuideCard key={card.title} card={card} />)}
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Current source links</div>
          <h2 className="cren-heading-lg">Use the operators&apos; calendars before you go</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {OFFICIAL_ACTIVITY_SOURCES.map((source) => (
              <a key={source.title} href={source.href} target="_blank" rel="noopener noreferrer" className="cren-soft cren-card-link p-5">
                <h3 className="font-semibold text-[color:var(--text-hero)]">{source.title} ↗</h3>
                <p className="cren-body mt-2 text-sm">{source.description}</p>
              </a>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="section-eyebrow">Plan close to home</div>
              <h2 className="cren-heading-lg">Jump into an area guide</h2>
            </div>
            <Link href="/areas" className="cren-action-chip">See every area</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredAreas.map((area) => (
              <Link key={area.slug} href={`/areas/${area.slug}`} className="cren-surface cren-card-link p-5">
                <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">{area.name}</h3>
                <p className="cren-body mt-2 text-sm">Parks, kids, food, entertainment, housing and services near this hub.</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="cren-soft p-6 md:p-8">
          <h2 className="cren-heading-lg">Four checks before leaving home</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {planningChecks.map((check) => <li key={check} className="cren-surface p-4 text-sm text-[color:var(--text-secondary)]">{check}</li>)}
          </ul>
        </section>
      </div>
    </CrenPage>
  );
}
