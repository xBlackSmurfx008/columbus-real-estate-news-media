import type { Metadata } from "next";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { AREA_SECTION_LABELS, AREA_SECTION_ORDER } from "@/lib/franklin-areas";
import { areasGroupedBySection, topics } from "@/lib/data";
import { POLICY_LIBRARY_ORDER, POLICY_PAGES, policyPath } from "@/lib/policy-pages";

export const metadata: Metadata = {
  title: "Site Map",
  description: "Browse every major Columbus Real Estate News section, housing resource, topic, and local area hub.",
  alternates: { canonical: "/site-map" },
};

type SiteMapLink = readonly [string, string];

const primarySections: { title: string; links: SiteMapLink[] }[] = [
  {
    title: "Housing and real estate",
    links: [
      ["Housing Search", "/housing-search"],
      ["Buy a Home", "/buy"],
      ["Buyer Price-Band Reality", "/buy/price-band-reality"],
      ["Rent a Home", "/rent"],
      ["Before You Sign Checklist", "/rent/before-you-sign"],
      ["Find a Rental", "/rent/find-a-home"],
      ["Sell Your Home", "/sell/your-home"],
      ["Sell an Investment Property", "/sell/investment-property"],
      ["Invest in Columbus", "/invest"],
      ["Deploy Capital", "/invest/deploy-capital"],
      ["Market Data", "/market-data"],
      ["Housing Resources", "/resources"],
    ],
  },
  {
    title: "Local living",
    links: [
      ["Things to Do", "/things-to-do"],
      ["Neighborhood and Area Guides", "/areas"],
      ["Local Business Directory", "/directory"],
      ["List Your Business", "/directory/list-your-business"],
      ["Sponsor-Safe Directory Rules", "/directory/sponsor-rules"],
      ["Events and Lifestyle", "/topics/events-lifestyle"],
      ["Schools", "/topics/schools"],
      ["Local Politics", "/topics/local-politics"],
    ],
  },
  {
    title: "News and information",
    links: [
      ["Latest Coverage", "/blog"],
      ["Topic Hubs", "/topics"],
      ["Newsroom", "/newsroom"],
      ["Editorial Standards", "/editorial-standards"],
      ["Corrections", "/corrections"],
    ],
  },
  {
    title: "About CREN",
    links: [
      ["About", "/about"],
      ["Advertise", "/advertise"],
      ["Media Kit and Rate Card", "/advertise/media-kit"],
      ["Self-Service Advertising Intake", "/advertise/self-service"],
      ["Claim or Update a Profile", "/profiles"],
      ["Profile Claim Dashboard", "/profiles/claim"],
      ["Join", "/join"],
      ["Subscribe", "/subscribe"],
      ["Saved Items", "/saved"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Legal and policy",
    links: [
      ["Policy Library", "/policies"],
      ["Privacy", "/privacy"],
      ["Terms of Use", "/terms"],
      ...POLICY_LIBRARY_ORDER.filter((key) => key !== "privacy" && key !== "terms").map(
        (key) => [POLICY_PAGES[key].title, policyPath(key)] as const,
      ),
    ],
  },
];

export default function SiteMapPage() {
  const groupedAreas = areasGroupedBySection();

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-6 md:p-8">
          <p className="section-eyebrow">Explore CREN</p>
          <h1 className="cren-heading-xl">Site Map</h1>
          <p className="cren-body mt-2 max-w-3xl">
            Find Columbus housing resources, local places, market coverage, neighborhood guides, and every major section of the website.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {primarySections.map((section) => (
            <div key={section.title} className="cren-surface p-6">
              <h2 className="cren-heading-md">{section.title}</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {section.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="cren-text-link">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Topic hubs</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <li key={topic.slug}>
                <Link href={`/topics/${topic.slug}`} className="cren-text-link">
                  {topic.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {AREA_SECTION_ORDER.map((kind) => {
          const label = AREA_SECTION_LABELS[kind];
          const sectionAreas = groupedAreas[label] ?? [];
          if (sectionAreas.length === 0) return null;

          return (
            <section key={kind} className="cren-surface p-6 md:p-8">
              <h2 className="cren-heading-lg">{label}</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sectionAreas.map((area) => (
                  <li key={area.slug}>
                    <Link href={`/areas/${area.slug}`} className="cren-text-link">
                      {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </CrenPage>
  );
}
