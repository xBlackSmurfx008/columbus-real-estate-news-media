import type { Area, AreaKind } from "@/lib/types";

/** Slugs that keep richer editorial blurbs in `data.ts` via overrides. */
export const FEATURED_AREA_SLUGS = [
  "columbus-citywide",
  "upper-arlington",
  "dublin",
  "grove-city",
  "westerville",
  "gahanna",
] as const;

type Seed = {
  slug: string;
  name: string;
  kind: AreaKind;
  /** Adjacent county context; shown on hub pages. */
  multiCountyNote?: string;
};

const DEFAULT_COPY: Record<
  AreaKind,
  { description: string; populationSignal: string }
> = {
  region: {
    description:
      "Metro-wide policy, market, and development signals—we file Franklin-focused stories here when they span the whole market.",
    populationSignal: "Broad mixed demand",
  },
  city: {
    description:
      "Franklin County municipality hub: inventory, demand, schools, and development as we publish.",
    populationSignal: "Local owner and renter interest",
  },
  neighborhood: {
    description:
      "City of Columbus neighborhood hub: demand shifts, development, and renter/buyer context.",
    populationSignal: "Urban-core housing interest",
  },
  cdp: {
    description:
      "Franklin County CDP or place name aligned with major listing sites (e.g. Zillow Franklin browse).",
    populationSignal: "Suburban housing demand",
  },
  corridor: {
    description:
      "Major retail and employment corridor; search and leasing demand cluster around these names.",
    populationSignal: "Commute and lifestyle demand",
  },
};

const SEEDS: Seed[] = [
  { slug: "columbus-citywide", name: "Columbus Citywide", kind: "region" },

  { slug: "bexley", name: "Bexley", kind: "city" },
  { slug: "brice", name: "Brice", kind: "city" },
  {
    slug: "canal-winchester",
    name: "Canal Winchester",
    kind: "city",
    multiCountyNote: "City limits also extend into Fairfield County.",
  },
  { slug: "columbus", name: "Columbus", kind: "city" },
  {
    slug: "dublin",
    name: "Dublin",
    kind: "city",
    multiCountyNote: "City limits also extend into Delaware and Union counties.",
  },
  { slug: "gahanna", name: "Gahanna", kind: "city" },
  { slug: "grandview-heights", name: "Grandview Heights", kind: "city" },
  { slug: "grove-city", name: "Grove City", kind: "city" },
  { slug: "groveport", name: "Groveport", kind: "city" },
  { slug: "harrisburg", name: "Harrisburg", kind: "city" },
  { slug: "hilliard", name: "Hilliard", kind: "city" },
  { slug: "marble-cliff", name: "Marble Cliff", kind: "city" },
  { slug: "minerva-park", name: "Minerva Park", kind: "city" },
  {
    slug: "new-albany",
    name: "New Albany",
    kind: "city",
    multiCountyNote: "City limits also extend into Licking County.",
  },
  { slug: "obetz", name: "Obetz", kind: "city" },
  {
    slug: "pickerington",
    name: "Pickerington",
    kind: "city",
    multiCountyNote: "City limits also extend into Fairfield County.",
  },
  {
    slug: "reynoldsburg",
    name: "Reynoldsburg",
    kind: "city",
    multiCountyNote: "City limits also extend into Licking County.",
  },
  { slug: "riverlea", name: "Riverlea", kind: "city" },
  { slug: "upper-arlington", name: "Upper Arlington", kind: "city" },
  { slug: "valleyview", name: "Valleyview", kind: "city" },
  {
    slug: "westerville",
    name: "Westerville",
    kind: "city",
    multiCountyNote: "City limits also extend into Delaware County.",
  },
  { slug: "whitehall", name: "Whitehall", kind: "city" },
  { slug: "worthington", name: "Worthington", kind: "city" },

  { slug: "blacklick", name: "Blacklick", kind: "cdp" },
  { slug: "blacklick-estates", name: "Blacklick Estates", kind: "cdp" },
  { slug: "edgewater-park", name: "Edgewater Park", kind: "cdp" },
  {
    slug: "galloway",
    name: "Galloway",
    kind: "cdp",
    multiCountyNote: "Also extends into Madison County.",
  },
  { slug: "hamilton-meadows", name: "Hamilton Meadows", kind: "cdp" },
  { slug: "huber-ridge", name: "Huber Ridge", kind: "cdp" },
  { slug: "lake-darby", name: "Lake Darby", kind: "cdp" },
  {
    slug: "lithopolis",
    name: "Lithopolis",
    kind: "cdp",
    multiCountyNote: "Also extends into Fairfield County.",
  },
  {
    slug: "lockbourne",
    name: "Lockbourne",
    kind: "cdp",
    multiCountyNote: "Also extends into Pickaway County.",
  },
  { slug: "mount-air", name: "Mount Air", kind: "cdp" },
  { slug: "new-rome", name: "New Rome", kind: "cdp" },
  {
    slug: "orient",
    name: "Orient",
    kind: "cdp",
    multiCountyNote: "Also extends into Pickaway County.",
  },
  { slug: "reese", name: "Reese", kind: "cdp" },
  { slug: "zimmer", name: "Zimmer", kind: "cdp" },
  { slug: "lincoln-village", name: "Lincoln Village", kind: "cdp" },

  { slug: "easton-area", name: "Easton area", kind: "corridor" },
  { slug: "polaris-area", name: "Polaris area", kind: "corridor" },

  { slug: "amercrest", name: "Amercrest", kind: "neighborhood" },
  { slug: "arena-district", name: "Arena District", kind: "neighborhood" },
  { slug: "brewery-district", name: "Brewery District", kind: "neighborhood" },
  { slug: "berwick", name: "Berwick", kind: "neighborhood" },
  { slug: "clintonville", name: "Clintonville", kind: "neighborhood" },
  { slug: "dennison-place", name: "Dennison Place", kind: "neighborhood" },
  { slug: "devon-triangle", name: "Devon Triangle", kind: "neighborhood" },
  { slug: "downtown-columbus", name: "Downtown", kind: "neighborhood" },
  { slug: "driving-park", name: "Driving Park", kind: "neighborhood" },
  { slug: "discovery-district", name: "Discovery District", kind: "neighborhood" },
  { slug: "eastmoor", name: "Eastmoor", kind: "neighborhood" },
  {
    slug: "fifth-by-northwest",
    name: "Fifth by Northwest (5xNW)",
    kind: "neighborhood",
  },
  { slug: "franklinton", name: "Franklinton", kind: "neighborhood" },
  { slug: "german-village", name: "German Village", kind: "neighborhood" },
  { slug: "glen-echo", name: "Glen Echo", kind: "neighborhood" },
  { slug: "harrison-west", name: "Harrison West", kind: "neighborhood" },
  { slug: "hilltop", name: "Hilltop", kind: "neighborhood" },
  { slug: "indiana-forest", name: "Indiana Forest", kind: "neighborhood" },
  { slug: "indianola-terrace", name: "Indianola Terrace", kind: "neighborhood" },
  { slug: "italian-village", name: "Italian Village", kind: "neighborhood" },
  {
    slug: "king-lincoln-bronzeville",
    name: "King-Lincoln Bronzeville",
    kind: "neighborhood",
  },
  { slug: "knollwood-village", name: "Knollwood Village", kind: "neighborhood" },
  { slug: "livingston", name: "Livingston", kind: "neighborhood" },
  { slug: "maize-morse", name: "Maize-Morse", kind: "neighborhood" },
  { slug: "merion-village", name: "Merion Village", kind: "neighborhood" },
  { slug: "milo-grogan", name: "Milo-Grogan", kind: "neighborhood" },
  {
    slug: "mount-vernon-columbus",
    name: "Mount Vernon",
    kind: "neighborhood",
    multiCountyNote: "Columbus neighborhood—not Mount Vernon, Knox County.",
  },
  { slug: "necko", name: "Necko", kind: "neighborhood" },
  { slug: "north-campus", name: "North Campus", kind: "neighborhood" },
  { slug: "north-linden", name: "North Linden", kind: "neighborhood" },
  { slug: "northland", name: "Northland", kind: "neighborhood" },
  { slug: "old-north-columbus", name: "Old North Columbus", kind: "neighborhood" },
  { slug: "olde-towne-east", name: "Olde Towne East", kind: "neighborhood" },
  { slug: "san-margherita", name: "San Margherita", kind: "neighborhood" },
  { slug: "short-north", name: "Short North", kind: "neighborhood" },
  { slug: "south-campus-area", name: "South Campus area", kind: "neighborhood" },
  { slug: "south-linden", name: "South Linden", kind: "neighborhood" },
  { slug: "south-side", name: "South Side", kind: "neighborhood" },
  { slug: "tri-village", name: "Tri-Village", kind: "neighborhood" },
  { slug: "university-district", name: "University District", kind: "neighborhood" },
  { slug: "victorian-village", name: "Victorian Village", kind: "neighborhood" },
  { slug: "walnut-hills", name: "Walnut Hills", kind: "neighborhood" },
  { slug: "weinland-park", name: "Weinland Park", kind: "neighborhood" },
  { slug: "westgate-west-scioto", name: "Westgate / West Scioto", kind: "neighborhood" },
  {
    slug: "ohio-state-university-area",
    name: "The Ohio State University area",
    kind: "neighborhood",
  },
];

export function franklinSeedsToAreas(): Area[] {
  return SEEDS.map((s) => {
    const { description, populationSignal } = DEFAULT_COPY[s.kind];
    return {
      slug: s.slug,
      name: s.name,
      description,
      populationSignal,
      kind: s.kind,
      ...(s.multiCountyNote ? { multiCountyNote: s.multiCountyNote } : {}),
    };
  });
}

export const AREA_SECTION_ORDER: AreaKind[] = ["region", "city", "neighborhood", "cdp", "corridor"];

export const AREA_SECTION_LABELS: Record<AreaKind, string> = {
  region: "Metro & citywide",
  city: "Cities & villages",
  neighborhood: "Columbus neighborhoods & districts",
  cdp: "CDPs & plan names",
  corridor: "Major corridors",
};
