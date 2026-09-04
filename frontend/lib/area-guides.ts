import type { Area } from "@/lib/types";

export type GuideCard = {
  title: string;
  description: string;
  href: string;
  image: string;
  imageAlt: string;
  external?: boolean;
  eyebrow: string;
};

export type AreaGuide = {
  representativeImage: string;
  representativeImageAlt: string;
  dailyLifeAnswer: string;
  discoveryCards: GuideCard[];
  housingCards: GuideCard[];
  serviceCards: GuideCard[];
};

export const GUIDE_IMAGES = {
  area: "/images/guides/area-explore.webp",
  parks: "/images/guides/parks-kids.webp",
  food: "/images/guides/food-drink.webp",
  arts: "/images/guides/arts-events.webp",
  housing: "/images/guides/housing-search.webp",
  services: "/images/guides/home-services.webp",
} as const;

const AREA_IMAGE_ROTATION = [GUIDE_IMAGES.area, GUIDE_IMAGES.parks, GUIDE_IMAGES.food, GUIDE_IMAGES.arts] as const;

function stableImageIndex(slug: string): number {
  return Array.from(slug).reduce((sum, character) => sum + character.charCodeAt(0), 0) % AREA_IMAGE_ROTATION.length;
}

export function representativeAreaImage(area: Area): string {
  if (area.kind === "region") return GUIDE_IMAGES.area;
  if (area.kind === "corridor") return GUIDE_IMAGES.food;
  if (area.kind === "cdp") return GUIDE_IMAGES.parks;
  return AREA_IMAGE_ROTATION[stableImageIndex(area.slug)]!;
}

function mapsSearch(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function localSearchTerm(area: Area): string {
  if (area.slug === "columbus-citywide") return "Columbus, Ohio";
  if (area.kind === "neighborhood" || area.kind === "corridor") return `${area.name}, Columbus, Ohio`;
  return `${area.name}, Ohio`;
}

function areaKindAnswer(area: Area): string {
  if (area.kind === "region") {
    return `Use the ${area.name} metro hub to compare housing choices with parks, family activities, food, arts, events, and practical services across Central Ohio.`;
  }
  if (area.kind === "neighborhood") {
    return `${area.name} is covered as a Columbus neighborhood or district. Use the live searches below to inspect nearby parks, family activities, food, entertainment, homes, rentals, and services without treating a changing business list as permanent.`;
  }
  if (area.kind === "corridor") {
    return `${area.name} is a cross-boundary shopping and employment corridor. Confirm the exact municipality, school district, taxes, and commute for any address while comparing its dining, entertainment, housing, and services.`;
  }
  if (area.kind === "cdp") {
    return `${area.name} is an indexed place name rather than a one-size-fits-all neighborhood. Confirm the exact address boundary while using this hub to find nearby parks, daily-life destinations, housing, rentals, and services.`;
  }
  return `${area.name} is covered as a Franklin County city or village hub, connecting housing and rental research with parks, family activities, food, entertainment, and local services.`;
}

export function getAreaGuide(area: Area): AreaGuide {
  const place = localSearchTerm(area);
  const representativeImage = representativeAreaImage(area);
  const representativeImageAlt = `Representative CREN editorial image for exploring daily life around ${area.name}`;

  return {
    representativeImage,
    representativeImageAlt,
    dailyLifeAnswer: areaKindAnswer(area),
    discoveryCards: [
      {
        eyebrow: "Daytime & outdoors",
        title: `Parks, trails and playgrounds near ${area.name}`,
        description: "Open a live map search, then verify hours, accessibility, amenities, closures, and program registration with the park operator.",
        href: mapsSearch(`parks trails playgrounds near ${place}`),
        image: GUIDE_IMAGES.parks,
        imageAlt: "Representative editorial image of families using a Central Ohio park",
        external: true,
      },
      {
        eyebrow: "Kids & family",
        title: `Family activities and library programs near ${area.name}`,
        description: "Find indoor and outdoor daytime ideas, story times, nature programs, museums, recreation centers, and low-cost activities.",
        href: mapsSearch(`family activities libraries recreation centers near ${place}`),
        image: GUIDE_IMAGES.parks,
        imageAlt: "Representative editorial image of a family day out in a park",
        external: true,
      },
      {
        eyebrow: "Eat & drink",
        title: `Local restaurants, coffee and casual hot spots in ${area.name}`,
        description: "Browse nearby places, then confirm current hours, menus, reservation rules, accessibility, and recent reviews with the business.",
        href: mapsSearch(`local restaurants coffee bakeries near ${place}`),
        image: GUIDE_IMAGES.food,
        imageAlt: "Representative editorial image of a Central Ohio neighborhood restaurant patio",
        external: true,
      },
      {
        eyebrow: "Arts & entertainment",
        title: `Arts, events and entertainment around ${area.name}`,
        description: "Explore theaters, galleries, live music, markets, festivals, sports, and community events using current listings.",
        href: mapsSearch(`arts entertainment events near ${place}`),
        image: GUIDE_IMAGES.arts,
        imageAlt: "Representative editorial image of a Central Ohio community arts event",
        external: true,
      },
    ],
    housingCards: [
      {
        eyebrow: "Buy",
        title: `Search homes for sale in ${area.name}`,
        description: "Compare active listings across multiple portals and confirm listing status, representation, fees, and property records before acting.",
        href: `/housing-search?area=${encodeURIComponent(area.name)}#buy`,
        image: GUIDE_IMAGES.housing,
        imageAlt: "Representative editorial image of mixed Central Ohio housing",
      },
      {
        eyebrow: "Rent",
        title: `Search apartments and houses for rent in ${area.name}`,
        description: "Check apartments, houses, condos, and townhomes; compare total monthly cost and verify the owner or manager before paying.",
        href: `/housing-search?area=${encodeURIComponent(area.name)}#rent`,
        image: GUIDE_IMAGES.housing,
        imageAlt: "Representative editorial image of rental and owner housing",
      },
      {
        eyebrow: "Sell",
        title: `Plan a home sale in ${area.name}`,
        description: "Start with property records, local market evidence, likely selling costs, timing, and your available representation paths.",
        // The `area` parameter is read by captureAttribution, so a seller lead
        // that starts on a hub stays attributable to the area even when
        // session storage is unavailable.
        href: `/sell/your-home?area=${encodeURIComponent(area.name)}`,
        image: GUIDE_IMAGES.housing,
        imageAlt: "Representative editorial image of a Central Ohio residential street",
      },
      {
        eyebrow: "List a rental",
        title: `List a rental property serving ${area.name}`,
        description: "Compare major rental-advertising options and request CREN listing support without mixing paid placement into editorial coverage.",
        href: "/housing-search#list-a-rental",
        image: GUIDE_IMAGES.housing,
        imageAlt: "Representative editorial image of varied Central Ohio homes",
      },
    ],
    serviceCards: [
      {
        eyebrow: "Home services",
        title: `Find providers serving ${area.name}`,
        description: "Browse service categories, then independently confirm licenses, insurance, references, written scope, and permits where applicable.",
        href: `/directory?area=${encodeURIComponent(area.name)}#home-services`,
        image: GUIDE_IMAGES.services,
        imageAlt: "Representative editorial image of local home-service professionals",
      },
      {
        eyebrow: "Local businesses",
        title: `Explore local living categories in ${area.name}`,
        description: "Use the directory to find food, drink, attractions, recreation, childcare, moving, housing, and neighborhood services.",
        href: `/directory?area=${encodeURIComponent(area.name)}#local-living`,
        image: GUIDE_IMAGES.food,
        imageAlt: "Representative editorial image of a neighborhood business district",
      },
      {
        eyebrow: "For businesses",
        title: `List a business serving ${area.name}`,
        description: "Submit service areas, categories, credentials, and contact details for review. Paid upgrades remain clearly labeled.",
        href: `/directory/list-your-business?area=${encodeURIComponent(area.name)}`,
        image: GUIDE_IMAGES.services,
        imageAlt: "Representative editorial image of a local service consultation",
      },
    ],
  };
}

export const OFFICIAL_ACTIVITY_SOURCES = [
  {
    title: "Columbus Recreation and Parks",
    description: "City parks, trails, community centers, pools, sports, and recreation programs.",
    href: "https://www.columbus.gov/Community/Recreation-and-Parks/Parks-Trails",
  },
  {
    title: "Columbus & Franklin County Metro Parks",
    description: "Regional parks, nature centers, family programs, trails, and current events.",
    href: "https://www.metroparks.net/",
  },
  {
    title: "Columbus Metropolitan Library",
    description: "Library locations plus current children, teen, adult, and community programs.",
    href: "https://events.columbuslibrary.org/events",
  },
  {
    title: "Experience Columbus",
    description: "Current citywide events, family attractions, itineraries, food, arts, and outdoor guides.",
    href: "https://www.experiencecolumbus.com/events/?sort=date&view=list",
  },
] as const;

// The housing-search comparison sets moved to `lib/outbound-partners.ts` on
// 2026-09-04 so that the destination list, the click dimensions, and the
// affiliate labelling all read from one registry. Import from there.

export const SERVICE_CATEGORIES = [
  "HVAC and indoor air",
  "Plumbing and drains",
  "Electrical",
  "Roofing and gutters",
  "Foundation and waterproofing",
  "General contractors and remodeling",
  "Painting and drywall",
  "Landscaping and tree care",
  "Cleaning and turnover",
  "Pest control",
  "Moving and storage",
  "Property management",
  "Real estate photography and staging",
  "Inspectors, appraisers, and surveyors",
  "Real estate attorneys and title services",
  "Insurance and lending",
] as const;

export const LOCAL_LIVING_CATEGORIES = [
  "Restaurants and bakeries",
  "Coffee, tea, breweries, and bars",
  "Arts, theaters, music, and galleries",
  "Family attractions and indoor play",
  "Parks, recreation, fitness, and sports",
  "Events, festivals, and markets",
  "Childcare, camps, and enrichment",
  "Pet care and pet-friendly places",
  "Groceries, markets, and specialty food",
  "Local shops and personal services",
] as const;
