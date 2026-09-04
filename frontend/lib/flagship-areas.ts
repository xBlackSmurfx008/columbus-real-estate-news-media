// ============================================================
// Flagship area hubs (owner plan 2026-09-04, P1 item 8).
//
// The owner's instruction was to stop spreading effort across ~70 thin hubs
// and make a small set exceptional on the German Village model: local
// tradeoffs, alternatives, verification prompts, housing data, a follow
// signup, housing actions, a directory, and the reporting we have actually
// published, all on one page.
//
// Selection rationale per area lives in
// docs/FLAGSHIP_AREA_HUBS_2026-09-04.md. The rule this file enforces is the
// journalism rule: nothing here states a neighborhood fact on its own
// authority.
//
//  * Every item in `reportingRecord` names a published CREN article by its
//    canonical slug. The page resolves the headline, date, and URL from the
//    live article set at render time. An entry whose article is not live is
//    dropped, so a hub can never cite coverage that does not exist.
//  * Every market number comes from the canonical market set
//    (lib/market-data.ts). This module never stores a price, a rent, or a
//    date. `buildAreaMarketComparison` only selects and arranges what the
//    canonical set already carries, and renders an explicit gap when a
//    geography has no published series.
//  * Reality-check copy describes tradeoffs, verification steps, and what our
//    own reporting showed. Where a figure appears in an FAQ it restates a
//    published CREN headline and links to it.
//
// This module is deliberately free of value imports so it can be unit tested
// with `node --test`.
// ============================================================

import type { MarketDataSet, MarketMetric } from "@/lib/market-data-core";

/**
 * Same shape as the proof-cohort `AreaRealityCheck` in consumer-insights,
 * minus the literal-slug field. Areas that already carry a proof-cohort
 * reality check keep it; flagship areas that do not get one here.
 */
export type FlagshipRealityCheck = {
  label: string;
  primaryQuestion: string;
  shortAnswer: string;
  bestFor: string[];
  notBestFor: string[];
  budgetReality: string;
  localLifeStack: string[];
  whatChanged: string[];
  whatToVerify: string[];
  nearbySubstitutes: Array<{ label: string; href: string }>;
  followPromise: string;
  cadence: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

/** One published CREN article, plus why it matters to somebody choosing this area. */
export type ReportingRecordEntry = {
  /** `canonical_slug` of a live CREN article. */
  articleSlug: string;
  /** What the story establishes, stated no more strongly than the story does. */
  whatItShows: string;
};

export type FlagshipFaq = {
  question: string;
  answer: string;
  /** Optional published CREN article the answer rests on. */
  sourceArticleSlug?: string;
};

export type FlagshipArea = {
  slug: string;
  /** One line on why this hub is a flagship. Mirrors the selection doc. */
  selectionRationale: string;
  /** Supplied only for flagship areas without a proof-cohort reality check. */
  realityCheck?: FlagshipRealityCheck;
  reportingRecord: ReportingRecordEntry[];
  /** Area slugs to line up against this one in the market comparison table. */
  comparisonSlugs: string[];
  faqs: FlagshipFaq[];
};

/** The metro baseline every flagship comparison table is anchored to. */
export const COMPARISON_BASELINE_SLUG = "columbus-citywide";

const FLAGSHIP_AREAS: FlagshipArea[] = [
  // ---------------------------------------------------------------
  {
    slug: "downtown-columbus",
    selectionRationale:
      "Deepest published CREN coverage of any single place (13 live articles) and the strongest search demand, offset by the honest constraint that no downtown-level home value or rent series exists in our canonical market data.",
    realityCheck: {
      label: "Flagship hub",
      primaryQuestion: "What is living in downtown Columbus actually like right now, and what is still unfinished?",
      shortAnswer:
        "Downtown is a working district that is still filling in its residential basics. Several of the amenities people move downtown for, including a grocery store and a new park, are announced or under construction rather than open, so check the current status of each one before you sign anything.",
      bestFor: [
        "People whose work, campus, or venue routine is already downtown",
        "Renters who want events, restaurants, and transit within walking distance",
        "Readers tracking office-to-residential conversion and public projects",
      ],
      notBestFor: [
        "Buyers who need a full grocery and park routine on day one",
        "Households looking for detached houses with private yards",
        "Anyone planning around an announced opening date as if it were certain",
      ],
      budgetReality:
        "CREN publishes no downtown-specific typical home value or rent series, so this hub will not show one. Compare the metro figures below, then price the exact building. Condominium fees, assessments, parking, and event-day access differ enough between downtown buildings that a district average would mislead you.",
      localLifeStack: [
        "Scioto Mile events and riverfront routine",
        "North Market and downtown restaurant openings",
        "Festival and stadium calendars that change street access",
        "Public project status before it is a finished amenity",
      ],
      whatChanged: [
        "A downtown office tower was named 2026 Redevelopment of the Year",
        "Columbus dropped a new courthouse plan and turned to renovation",
        "A grocery store has been announced for downtown with a 2028 build date",
        "A downtown park promoted as open was still not open when we checked",
      ],
      whatToVerify: [
        "Whether an announced opening has actually happened yet",
        "The building's monthly fees, assessments, and parking terms",
        "Event and festival dates that close streets near the address",
        "Active construction next to the unit and how long it runs",
        "Which downtown sub-district the address is really in",
      ],
      nearbySubstitutes: [
        { label: "Arena District", href: "/areas/arena-district" },
        { label: "Discovery District", href: "/areas/discovery-district" },
        { label: "Short North", href: "/areas/short-north" },
        { label: "Franklinton", href: "/areas/franklinton" },
      ],
      followPromise: "Get downtown Columbus development, opening-status, and local-life alerts.",
      cadence: "Weekly",
      primaryCta: { label: "Open Development Watch", href: "/topics/development" },
      secondaryCta: {
        label: "Follow Downtown",
        href: "/subscribe?source=downtown-columbus-reality-check&topic=Area%20Alerts&area=Downtown",
      },
    },
    reportingRecord: [
      {
        articleSlug: "columbus-diocese-plans-to-demolish-1908-gay-st-building",
        whatItShows: "A 1908 Gay Street building is proposed for demolition, so the downtown streetscape is still changing block by block.",
      },
      {
        articleSlug: "downtown-columbus-office-tower-wins-2026-redevelopment-of-the-year",
        whatItShows: "An office tower conversion won a 2026 redevelopment award, which is recognition of finished work rather than a forecast.",
      },
      {
        articleSlug: "downtown-columbus-s-preston-park-still-isn-t-open-developer-says",
        whatItShows: "A downtown park that readers expected to use was still not open when the developer was asked.",
      },
      {
        articleSlug: "aldi-will-build-a-downtown-columbus-grocery-store-by-2028",
        whatItShows: "A downtown grocery store is planned with a 2028 build date, which is an announcement and not a store you can shop at now.",
      },
      {
        articleSlug: "columbus-north-market-tower-program-now-lists-142-residences",
        whatItShows: "The North Market tower program now lists 142 residences, so the downtown for-sale and rental supply is still being defined.",
      },
      {
        articleSlug: "columbus-stops-new-courthouse-plan-and-turns-to-renovation",
        whatItShows: "The city stopped a new courthouse plan and turned to renovation, changing what happens on a large downtown site.",
      },
      {
        articleSlug: "amara-brings-mediterranean-dining-back-to-the-scioto-mile",
        whatItShows: "A Scioto Mile restaurant space is in use again, which is part of the daily-life case for living downtown.",
      },
      {
        articleSlug: "festival-latino-columbus-move-changes-downtown-visitor-plan",
        whatItShows: "A major festival moved, which changes downtown crowd and street patterns on those dates.",
      },
    ],
    comparisonSlugs: ["arena-district", "short-north", "german-village", "franklinton"],
    faqs: [
      {
        question: "Does downtown Columbus have a grocery store?",
        answer:
          "Not a full one yet. CREN reported that ALDI plans to build a downtown Columbus grocery store by 2028. Until it opens, plan your groceries around North Market, nearby stores outside the core, and delivery, and treat the 2028 date as a plan rather than a guarantee.",
        sourceArticleSlug: "aldi-will-build-a-downtown-columbus-grocery-store-by-2028",
      },
      {
        question: "Why does this hub not show a downtown home price or rent?",
        answer:
          "Because we do not have one we can source. Our canonical market data carries city and neighborhood series only where a named public source publishes them, and no downtown Columbus series is published in it. We would rather show the gap than average something together and call it downtown.",
      },
      {
        question: "What should I check before renting or buying downtown?",
        answer:
          "Check whether the amenities in the listing already exist. CREN found a downtown park still closed after it was promoted as an attraction. Then price the building's fees and parking, and look up festival and stadium dates for the streets around the address.",
        sourceArticleSlug: "downtown-columbus-s-preston-park-still-isn-t-open-developer-says",
      },
    ],
  },

  // ---------------------------------------------------------------
  {
    slug: "arena-district",
    selectionRationale:
      "The highest organic entrance count of any CREN area in the 30 days to 2026-09-04 (12 search entrances across 20 article views), on three live articles that together tell one story: an events and office district adding housing. No canonical market series exists for it, so the hub shows that gap rather than borrowing a number.",
    realityCheck: {
      label: "Flagship hub",
      primaryQuestion: "Is the Arena District becoming a place to live rather than a place to go out in?",
      shortAnswer:
        "Housing is being added here, and most of it is still early. One large residential plan remains in early design while a nearby office conversion has published unit counts. Judge the district on what has opened, not on what has been drawn.",
      bestFor: [
        "Renters who want events, restaurants, and offices within walking distance",
        "People who work downtown and want a short walk to work",
        "Readers tracking office-to-residential conversion in the urban core",
      ],
      notBestFor: [
        "Households who want quiet on game and concert nights",
        "Buyers who need a settled residential street today",
        "Anyone pricing a move on a plan that is still in early design",
      ],
      budgetReality:
        "No Arena District home value or rent series exists in our canonical market data, so this hub does not show one. Use the metro figures in the comparison table as context and then price the specific building, including parking, event-night access, and any assessment.",
      localLifeStack: [
        "Stadium and arena event calendars",
        "Restaurant openings on and around Park Street",
        "Riverfront and downtown park access",
        "Parking and street access on event nights",
      ],
      whatChanged: [
        "A 242-unit Arena District plan remains in early design",
        "Nationwide detailed a 148-home conversion at 280 North High",
        "A new restaurant opened on Park Street in August 2026",
      ],
      whatToVerify: [
        "Whether a residential project is approved, permitted, or only designed",
        "Event-night noise, crowds, and street closures at the address",
        "Parking terms and what they cost on event nights",
        "Building fees, assessments, and what they cover",
        "Which downtown sub-district the address actually sits in",
      ],
      nearbySubstitutes: [
        { label: "Downtown", href: "/areas/downtown-columbus" },
        { label: "Short North", href: "/areas/short-north" },
        { label: "Victorian Village", href: "/areas/victorian-village" },
        { label: "Franklinton", href: "/areas/franklinton" },
      ],
      followPromise: "Get Arena District housing, conversion, and opening alerts.",
      cadence: "Weekly",
      primaryCta: { label: "Open Development Watch", href: "/topics/development" },
      secondaryCta: {
        label: "Follow Arena District",
        href: "/subscribe?source=arena-district-reality-check&topic=Area%20Alerts&area=Arena%20District",
      },
    },
    reportingRecord: [
      {
        articleSlug: "arena-district-242-unit-plan-remains-in-early-design",
        whatItShows: "A 242-unit plan remains in early design, which is the earliest stage and not a construction commitment.",
      },
      {
        articleSlug: "nationwide-details-148-home-columbus-conversion-at-280-north-high",
        whatItShows: "Nationwide detailed a 148-home conversion at 280 North High, giving a specific unit count for one project.",
      },
      {
        articleSlug: "sugar-opens-aug-27-at-504-park-st-in-columbus-arena-district",
        whatItShows: "A restaurant opened at 504 Park St. on Aug. 27, a dated opening rather than an announcement.",
      },
    ],
    comparisonSlugs: ["downtown-columbus", "short-north", "german-village"],
    faqs: [
      {
        question: "How many new homes are coming to the Arena District?",
        answer:
          "Two projects have published counts, at different stages. CREN reported a 242-unit plan still in early design and a 148-home conversion at 280 North High that Nationwide has detailed. Early design can change or stop, so do not treat the two counts as equivalent.",
        sourceArticleSlug: "arena-district-242-unit-plan-remains-in-early-design",
      },
      {
        question: "Why does this hub show no Arena District home price?",
        answer:
          "Because no public source publishes an Arena District series that we can cite. Our market data carries a value only where a named source publishes it for that exact geography. Leaving the cell empty is the honest answer.",
      },
      {
        question: "What is it like living next to the stadium and arena?",
        answer:
          "Plan for event nights. Check the venue calendars for the months you would live there, then visit the exact address on an event night and on a normal night before you decide. Ask the building about parking rules and guest access on those dates.",
      },
    ],
  },

  // ---------------------------------------------------------------
  {
    slug: "dublin",
    selectionRationale:
      "Second-deepest coverage (7 live articles), a complete Zillow home value and rent series, and the strongest premium-suburb search demand in the metro. Already a proof-cohort hub, so the reality check stays and the reporting record, comparison table, and FAQ are added.",
    reportingRecord: [
      {
        articleSlug: "dublin-approves-bridge-north-plan-with-296-homes",
        whatItShows: "Dublin approved the Bridge North plan with 296 homes, which is an approval rather than a completed project.",
      },
      {
        articleSlug: "northwest-bank-plans-new-dublin-headquarters-at-bridge-north",
        whatItShows: "Northwest Bank plans a headquarters at Bridge North, adding employment to the same district as the new housing.",
      },
      {
        articleSlug: "the-ellis-starts-construction-after-dublin-approved-block-j-plan",
        whatItShows: "The Ellis started construction after the Block J approval, so one Bridge Park phase has moved from paper to site work.",
      },
      {
        articleSlug: "dublin-bright-road-plan-advances-but-price-effects-are-unproven",
        whatItShows: "The Bright Road plan advanced, and we could not prove any effect on home prices from it.",
      },
      {
        articleSlug: "dublin-bishop-elementary-is-already-open-boundaries-still-matter",
        whatItShows: "Bishop Elementary is already open, and attendance boundaries still decide which school an address feeds.",
      },
      {
        articleSlug: "dublin-irish-festival-completed-its-39th-year-at-coffman-park",
        whatItShows: "The Irish Festival completed its 39th year at Coffman Park, one of the recurring events that shapes an August weekend here.",
      },
      {
        articleSlug: "dublin-ohio-christmas-market-opens-nov-21-at-riverside-crossing-park",
        whatItShows: "The Christmas Market opens Nov. 21 at Riverside Crossing Park, a dated event you can plan around.",
      },
    ],
    comparisonSlugs: ["hilliard", "worthington", "westerville", "new-albany", "upper-arlington"],
    faqs: [
      {
        question: "Is Dublin worth the premium over Hilliard?",
        answer:
          "That depends on what the premium buys for your household. The comparison table on this page puts the two typical home values and rents side by side from the same source and period. Then check the school attendance area, the tax district, and your real commute, because those change the monthly number more than the sticker price does.",
      },
      {
        question: "Will new Dublin development push prices up?",
        answer:
          "We cannot show that. When the Bright Road plan advanced, CREN looked for a price effect and reported that it is unproven. Treat a project approval as a change in supply and timing, not as a forecast of your home's value.",
        sourceArticleSlug: "dublin-bright-road-plan-advances-but-price-effects-are-unproven",
      },
      {
        question: "Does a Dublin address guarantee a specific school?",
        answer:
          "No. CREN reported that Bishop Elementary is already open and that boundaries still matter. Verify the attendance area for the exact address with the district before you make an offer, and check it again if boundaries are being redrawn.",
        sourceArticleSlug: "dublin-bishop-elementary-is-already-open-boundaries-still-matter",
      },
    ],
  },

  // ---------------------------------------------------------------
  {
    slug: "german-village",
    selectionRationale:
      "The model hub the owner pointed at. Four live articles, a published neighborhood home value series, and continuing historic-review news. Its reality check stays; the reporting record, comparison table, and FAQ are added.",
    reportingRecord: [
      {
        articleSlug: "columbus-german-village-cedar-square-wins-contested-3-2-vote",
        whatItShows: "Cedar Square won a contested 3-2 vote, showing how narrow historic-review decisions can be here.",
      },
      {
        articleSlug: "german-village-data-show-higher-prices-but-slower-sales-in-2026",
        whatItShows: "Prices ran higher while sales ran slower in 2026, so a strong price alone does not mean a fast sale.",
      },
      {
        articleSlug: "german-village-home-prices-are-high-but-the-sample-is-small",
        whatItShows: "The sale count behind German Village price averages is small, which makes any single month unreliable.",
      },
      {
        articleSlug: "columbus-oktoberfest-returns-but-it-does-not-prove-home-demand",
        whatItShows: "A returning festival is a local-life fact and not evidence of housing demand.",
      },
    ],
    // The urban-core areas German Village readers actually weigh against it
    // have no published series, so the comparison set here is the price peers
    // that do. The nearby-substitutes list above covers adjacency.
    comparisonSlugs: ["bexley", "upper-arlington", "dublin"],
    faqs: [
      {
        question: "Are German Village home prices reliable month to month?",
        answer:
          "No. CREN reported that the sample behind German Village price figures is small, so one month can move sharply without anything real changing. Read the typical value series on this page as a level rather than a trend, and check the period it covers.",
        sourceArticleSlug: "german-village-home-prices-are-high-but-the-sample-is-small",
      },
      {
        question: "Can I renovate a German Village house the way I want?",
        answer:
          "Plan on review. Exterior work in the historic district goes through a review process, and CREN has covered decisions that passed by a single vote. Ask what is allowed for the exact property, and what the last owner was or was not permitted to do, before you budget the work.",
        sourceArticleSlug: "columbus-german-village-cedar-square-wins-contested-3-2-vote",
      },
      {
        question: "Why does this hub show a home value but no rent figure?",
        answer:
          "Our canonical market data carries a published neighborhood home value series for German Village and no rent series for the same geography. Rather than borrow a city rent and label it German Village, the snapshot on this page leaves that measure out.",
      },
    ],
  },

  // ---------------------------------------------------------------
  {
    slug: "hilliard",
    selectionRationale:
      "Five live articles, a complete home value and rent series, and a genuine substitution story: buyers priced out of Dublin search here next. Both sides of that comparison now carry sourced numbers.",
    realityCheck: {
      label: "Flagship hub",
      primaryQuestion: "Is Hilliard the practical alternative when Dublin or Upper Arlington is out of budget?",
      shortAnswer:
        "Hilliard is a west-side suburb that people usually reach by comparison. The useful question is what you give up and what you gain against Dublin and Upper Arlington on price, commute, schools, and how finished the local retail is.",
      bestFor: [
        "Buyers comparing west-side suburbs on total monthly cost",
        "Families who want suburban services without the top-tier price",
        "Renters who need bus service and a short drive to work",
      ],
      notBestFor: [
        "Buyers who want dense urban walkability",
        "Anyone assuming every Hilliard address has the same schools or taxes",
        "People who need a finished mixed-use center today",
      ],
      budgetReality:
        "Compare the Hilliard typical value and rent below against Dublin and Upper Arlington in the same table, from the same source and period. That comparison is the entire point of this hub. After it, price the specific address: taxes, any homeowners association fee, and the commute at the hour you actually drive.",
      localLifeStack: [
        "Old Hilliard restaurants and storefront reuse",
        "Bus service that changed in September",
        "Recurring festivals held in the city",
        "Redevelopment of the former Chase site",
      ],
      whatChanged: [
        "Hilliard selected a mixed-use concept for the former Chase site",
        "An Old Hilliard bank building reopened as a restaurant",
        "COTA Line 30 was set to serve Hilliard rather than Dublin in September",
        "A promoted pickleball club still listed itself as coming soon",
      ],
      whatToVerify: [
        "The school attendance area for the exact address",
        "Current bus routing and stops if you plan to ride",
        "Whether an announced business has actually opened",
        "Taxes and any homeowners association cost",
        "Construction timing on nearby redevelopment sites",
      ],
      nearbySubstitutes: [
        { label: "Dublin", href: "/areas/dublin" },
        { label: "Upper Arlington", href: "/areas/upper-arlington" },
        { label: "Grove City", href: "/areas/grove-city" },
        { label: "Westerville", href: "/areas/westerville" },
      ],
      followPromise: "Get Hilliard housing, development, transit, and local-business alerts.",
      cadence: "Weekly or biweekly",
      primaryCta: { label: "Compare west-side suburbs", href: "/search?q=Hilliard%20Dublin%20Upper%20Arlington" },
      secondaryCta: {
        label: "Follow Hilliard",
        href: "/subscribe?source=hilliard-reality-check&topic=Area%20Alerts&area=Hilliard",
      },
    },
    reportingRecord: [
      {
        articleSlug: "hilliard-selects-mixed-use-concept-for-former-chase-site",
        whatItShows: "The city selected a mixed-use concept for the former Chase site, which is a selected concept and not a build permit.",
      },
      {
        articleSlug: "old-hilliard-bank-building-becomes-lira-italian-kitchen",
        whatItShows: "An Old Hilliard bank building reopened as a restaurant, one measurable sign of storefront reuse in the old core.",
      },
      {
        articleSlug: "cota-line-30-will-serve-hilliard-not-dublin-in-september",
        whatItShows: "A COTA route change was set to serve Hilliard rather than Dublin, which matters if you plan to commute by bus.",
      },
      {
        articleSlug: "hilliard-pickleball-club-still-says-coming-soon-before-target",
        whatItShows: "A promoted recreation venue still listed itself as coming soon, so amenities in a listing need checking.",
      },
      {
        articleSlug: "columbus-food-truck-festival-continues-in-hilliard-through-tonight",
        whatItShows: "A metro-scale food festival ran in Hilliard, part of the recurring event calendar here.",
      },
    ],
    comparisonSlugs: ["dublin", "upper-arlington", "westerville", "gahanna"],
    faqs: [
      {
        question: "How does Hilliard compare with Dublin on price?",
        answer:
          "The comparison table on this page shows both typical home values and both rents from the same source and the same period, so the gap is measured rather than asserted. Use it as a starting point and then compare specific listings, because condition and lot size move a price more than a city average does.",
      },
      {
        question: "Can I commute from Hilliard by bus?",
        answer:
          "Check the current routing first. CREN reported that COTA Line 30 was set to serve Hilliard rather than Dublin in September. Routes change, so confirm the stop nearest your address and the trip time before you count on it.",
        sourceArticleSlug: "cota-line-30-will-serve-hilliard-not-dublin-in-september",
      },
      {
        question: "Is Old Hilliard being redeveloped?",
        answer:
          "Parts of it are moving. The city selected a mixed-use concept for the former Chase site, and a former bank building reopened as a restaurant. A selected concept is an early step, so ask for the current schedule before you assume a completion date.",
        sourceArticleSlug: "hilliard-selects-mixed-use-concept-for-former-chase-site",
      },
    ],
  },

  // ---------------------------------------------------------------
  {
    slug: "upper-arlington",
    selectionRationale:
      "The only area hub with any organic entrance in the last 30 days, the highest typical home value in our canonical data, a complete value and rent series, and a live school funding question that changes the monthly cost of owning here.",
    realityCheck: {
      label: "Flagship hub",
      primaryQuestion: "What does it really cost to own in Upper Arlington, including the tax side?",
      shortAnswer:
        "Upper Arlington carries the highest typical home value in our sourced data, and the school funding question on the 2026 ballot is part of the cost of owning here. Price the tax line as carefully as the purchase price.",
      bestFor: [
        "Buyers prioritising schools and established neighborhoods",
        "Move-up buyers who want to stay inside the outerbelt",
        "Owners tracking the tax and levy side of a housing decision",
      ],
      notBestFor: [
        "Buyers looking for the metro's lower price bands",
        "Anyone who wants new construction with minimal maintenance",
        "Readers who treat one strong sales week as a market trend",
      ],
      budgetReality:
        "Start from the typical value and rent below, then add the tax line. CREN reported a 2026 ballot question that combines a $273.5 million bond with 4.9 mills. A bond and a millage change the monthly payment for every owner in the district, so ask your lender to quote the payment under the outcome rather than under today's bill alone.",
      localLifeStack: [
        "Lane Avenue retail and its current tenants",
        "Neighborhood parks and city recreation programs",
        "School district decisions and their funding",
        "Resale depth in a district with few new lots",
      ],
      whatChanged: [
        "The Shops on Lane Avenue split a former anchor space into three tenants",
        "The 2026 ballot combines a $273.5 million bond with 4.9 mills",
        "Upper Arlington led one week of high-price county sales, which is one week and not a trend",
      ],
      whatToVerify: [
        "The current tax bill and what the ballot outcome would add",
        "The exact attendance area for the address",
        "Age of the roof, mechanical systems, and any addition permits",
        "Whether recent comparable sales match the home's condition",
        "Lot, setback, and renovation limits before you plan work",
      ],
      nearbySubstitutes: [
        { label: "Bexley", href: "/areas/bexley" },
        { label: "Grandview Heights", href: "/areas/grandview-heights" },
        { label: "Worthington", href: "/areas/worthington" },
        { label: "Dublin", href: "/areas/dublin" },
      ],
      followPromise: "Get Upper Arlington housing, school funding, tax, and retail alerts.",
      cadence: "Biweekly",
      primaryCta: { label: "Compare established suburbs", href: "/search?q=Upper%20Arlington%20Bexley%20Worthington" },
      secondaryCta: {
        label: "Follow Upper Arlington",
        href: "/subscribe?source=upper-arlington-reality-check&topic=Area%20Alerts&area=Upper%20Arlington",
      },
    },
    reportingRecord: [
      {
        articleSlug: "upper-arlington-ballot-combines-273-5m-bond-and-4-9-mills",
        whatItShows: "The 2026 ballot combines a $273.5 million bond with 4.9 mills, which is a direct cost question for every owner in the district.",
      },
      {
        articleSlug: "upper-arlington-s-shops-on-lane-avenue-splits-old-anchor-into-three-tenants",
        whatItShows: "A former anchor space on Lane Avenue was split into three tenants, a measurable change in the retail mix.",
      },
      {
        articleSlug: "upper-arlington-led-one-week-of-high-price-county-sales",
        whatItShows: "Upper Arlington led one week of high-price county sales, and one week is not a trend.",
      },
    ],
    comparisonSlugs: ["bexley", "worthington", "dublin", "german-village"],
    faqs: [
      {
        question: "What is on the 2026 Upper Arlington schools ballot?",
        answer:
          "CREN reported a ballot question that combines a $273.5 million bond with 4.9 mills. Read the district's own ballot language for the exact wording, and ask your lender what the outcome would do to your monthly escrow before you set a maximum offer.",
        sourceArticleSlug: "upper-arlington-ballot-combines-273-5m-bond-and-4-9-mills",
      },
      {
        question: "Is Upper Arlington the most expensive place in the metro?",
        answer:
          "It carries the highest typical home value among the geographies in our canonical market data, which you can see in the comparison table on this page. That is a statement about the areas we have a sourced series for, not about every address in Central Ohio.",
      },
      {
        question: "Did Upper Arlington lead the county in home sales?",
        answer:
          "For one week. CREN reported that it led a single week of high-price county sales and said plainly that one week does not establish a trend. Compare several months before you read direction into it.",
        sourceArticleSlug: "upper-arlington-led-one-week-of-high-price-county-sales",
      },
    ],
  },

  // ---------------------------------------------------------------
  {
    slug: "new-albany",
    selectionRationale:
      "Three live articles on the metro's largest economic story, the data center and chip corridor, plus a complete home value and rent series. National search interest in Intel and Meta lands here, and our coverage answers it with what is proven rather than promised.",
    realityCheck: {
      label: "Flagship hub",
      primaryQuestion: "How much of the New Albany jobs and land value story is proven, and how much is still a forecast?",
      shortAnswer:
        "New Albany sits next to the metro's biggest announced investments, and CREN's reporting keeps finding the same thing: construction milestones are verifiable while job counts, household savings, and land value gains are still forecasts. Buy on what exists today.",
      bestFor: [
        "Buyers who want a high-service suburb next to a major job corridor",
        "Owners and investors tracking the data center and chip pipeline",
        "Readers who want the forecast separated from the record",
      ],
      notBestFor: [
        "Anyone pricing a purchase on promised jobs",
        "Buyers assuming an announced timeline will hold",
        "Households looking for lower price bands in Franklin County",
      ],
      budgetReality:
        "Use the typical value and rent below as the starting level, then treat every economic projection you read about this corridor as unproven until it is built and staffed. CREN reported that an Intel delay left land value claims hard to prove and that household bill claims tied to a data center project needed evidence.",
      localLifeStack: [
        "The Rose Run and Market Street area",
        "Employment growth along the corridor",
        "Utility and infrastructure projects tied to large sites",
        "School and municipal decisions in a fast-growing city",
      ],
      whatChanged: [
        "A grid battery project started construction near New Albany",
        "The Meta Prometheus project advanced while household bill claims still needed evidence",
        "An Intel delay left land value claims hard to prove",
      ],
      whatToVerify: [
        "Whether a project is announced, permitted, under construction, or operating",
        "Which county and school district the exact address is in",
        "Construction traffic and utility work near the property",
        "Taxes and any homeowners association cost",
        "Comparable sales that closed rather than list prices",
      ],
      nearbySubstitutes: [
        { label: "Westerville", href: "/areas/westerville" },
        { label: "Gahanna", href: "/areas/gahanna" },
        { label: "Dublin", href: "/areas/dublin" },
        { label: "Worthington", href: "/areas/worthington" },
      ],
      followPromise: "Get New Albany development, employment corridor, and housing alerts.",
      cadence: "Weekly",
      primaryCta: { label: "Open Development Watch", href: "/topics/development" },
      secondaryCta: {
        label: "Follow New Albany",
        href: "/subscribe?source=new-albany-reality-check&topic=Development%20Watch&area=New%20Albany",
      },
    },
    reportingRecord: [
      {
        articleSlug: "intel-ohio-delay-leaves-land-value-claims-hard-to-prove",
        whatItShows: "An Intel delay left land value claims hard to prove, so nearby land pricing based on that project is speculative.",
      },
      {
        articleSlug: "meta-prometheus-advances-but-household-bill-claims-need-evidence",
        whatItShows: "The Meta Prometheus project advanced while claims about household bills still needed evidence.",
      },
      {
        articleSlug: "flint-grid-battery-starts-construction-near-new-albany",
        whatItShows: "A grid battery project started construction near New Albany, which is a verifiable milestone rather than an announcement.",
      },
    ],
    comparisonSlugs: ["westerville", "gahanna", "dublin", "worthington"],
    faqs: [
      {
        question: "Has the Intel project raised land values near New Albany?",
        answer:
          "We could not show that it has. CREN reported that the Intel delay leaves land value claims hard to prove. If a seller or agent quotes a gain to you, ask which closed sales support it.",
        sourceArticleSlug: "intel-ohio-delay-leaves-land-value-claims-hard-to-prove",
      },
      {
        question: "Will data center projects lower my utility bill?",
        answer:
          "Treat that claim as unproven. When the Meta Prometheus project advanced, CREN reported that household bill claims still needed evidence. Read the actual filing or rate case before you budget around a saving.",
        sourceArticleSlug: "meta-prometheus-advances-but-household-bill-claims-need-evidence",
      },
      {
        question: "Is New Albany entirely in Franklin County?",
        answer:
          "No. City limits also extend into Licking County, which changes the county records, tax district, and sometimes the school district for an address. Confirm the county on the parcel record before you rely on any local figure.",
      },
    ],
  },

  // ---------------------------------------------------------------
  {
    slug: "gahanna",
    selectionRationale:
      "Three live articles, a complete home value and rent series, a mid-price position between the east-side suburbs, and an airport employment corridor that draws commercial search. Its downtown redevelopment story is live and unresolved, which is exactly the kind of question a hub can answer honestly.",
    realityCheck: {
      label: "Flagship hub",
      primaryQuestion: "Is Gahanna's downtown redevelopment far enough along to count on?",
      shortAnswer:
        "Gahanna is a mid-priced east-side suburb next to the airport employment corridor. Its Creekside redevelopment sites have been cleared, and CREN's reporting has repeatedly found that construction plans there are still early. Value the city on what stands today.",
      bestFor: [
        "Buyers who want suburban services below the top price bands",
        "People working in the airport and east-side employment corridor",
        "Renters comparing east-side options with a short commute",
      ],
      notBestFor: [
        "Buyers paying a premium for a downtown that is not built yet",
        "Anyone who needs certainty on a redevelopment schedule",
        "Households wanting urban-core density and walkability",
      ],
      budgetReality:
        "Start with the typical value and rent below and compare them against Westerville, New Albany, and Bexley in the same table. Do not price in the Creekside redevelopment. Cleared land is not a completed district, and no construction schedule has been set in our reporting.",
      localLifeStack: [
        "The Creekside area and its current tenants",
        "City parks, trails, and recreation programs",
        "Airport corridor employment",
        "East-side retail and everyday services",
      ],
      whatChanged: [
        "Gahanna cleared Creekside sites while construction remained unset",
        "A later check found the cleared site still had only early plans",
        "An industrial campus near the airport sold for $42 million",
      ],
      whatToVerify: [
        "The current status of any Creekside redevelopment phase",
        "The school district for the exact address",
        "Airport flight path and noise conditions at the property",
        "Taxes and any homeowners association cost",
        "Closed comparable sales rather than asking prices",
      ],
      nearbySubstitutes: [
        { label: "Westerville", href: "/areas/westerville" },
        { label: "New Albany", href: "/areas/new-albany" },
        { label: "Bexley", href: "/areas/bexley" },
        { label: "Reynoldsburg", href: "/areas/reynoldsburg" },
      ],
      followPromise: "Get Gahanna development, Creekside status, and housing alerts.",
      cadence: "Biweekly",
      primaryCta: { label: "Open Development Watch", href: "/topics/development" },
      secondaryCta: {
        label: "Follow Gahanna",
        href: "/subscribe?source=gahanna-reality-check&topic=Area%20Alerts&area=Gahanna",
      },
    },
    reportingRecord: [
      {
        articleSlug: "gahanna-clears-creekside-sites-but-construction-is-unset",
        whatItShows: "The city cleared Creekside sites while the construction schedule stayed unset.",
      },
      {
        articleSlug: "gahanna-creekside-site-is-cleared-but-plans-are-still-early",
        whatItShows: "A follow-up check found the cleared Creekside site still had only early plans.",
      },
      {
        articleSlug: "gahanna-industrial-campus-near-airport-sells-for-42-million",
        whatItShows: "An industrial campus near the airport sold for $42 million, a recorded transaction in the employment corridor.",
      },
    ],
    comparisonSlugs: ["westerville", "new-albany", "bexley", "hilliard"],
    faqs: [
      {
        question: "When will Gahanna's Creekside redevelopment be built?",
        answer:
          "No schedule has been established in our reporting. CREN found the sites cleared with construction unset, then checked again later and found the plans still early. Ask the city for the current phase before you treat it as a reason to buy nearby.",
        sourceArticleSlug: "gahanna-creekside-site-is-cleared-but-plans-are-still-early",
      },
      {
        question: "How does Gahanna price against New Albany?",
        answer:
          "The comparison table on this page puts both typical home values and both rents side by side from the same source and period. The two cities sit at different levels, and the table shows the size of that gap without either of us estimating it.",
      },
      {
        question: "Is the airport corridor a factor for homeowners here?",
        answer:
          "It is an employment factor and a property factor. CREN reported a $42 million sale of an industrial campus near the airport. For a home purchase, check the flight path and noise conditions at the specific address rather than for the city as a whole.",
        sourceArticleSlug: "gahanna-industrial-campus-near-airport-sells-for-42-million",
      },
    ],
  },
];

const flagshipBySlug = new Map(FLAGSHIP_AREAS.map((entry) => [entry.slug, entry]));

/** Ordered flagship slugs. Used by the sitemap boost and the measurement report. */
export const FLAGSHIP_AREA_SLUGS: readonly string[] = FLAGSHIP_AREAS.map((entry) => entry.slug);

export function isFlagshipArea(slug: string): boolean {
  return flagshipBySlug.has(slug);
}

export function getFlagshipArea(slug: string): FlagshipArea | null {
  return flagshipBySlug.get(slug) ?? null;
}

export function getFlagshipRealityCheck(slug: string): FlagshipRealityCheck | null {
  return flagshipBySlug.get(slug)?.realityCheck ?? null;
}

// ---------- reporting record resolution ----------

/** The article fields the reporting record needs to render a real link. */
export type ResolvableArticle = {
  title: string;
  date: string;
  canonical_slug?: string | null;
  area_slug?: string | null;
};

export type ResolvedReportingEntry<T extends ResolvableArticle> = {
  article: T;
  whatItShows: string;
};

/**
 * Join the curated reporting record onto live articles.
 *
 * An entry whose article is not in the live set is dropped rather than
 * rendered, so a hub can never point at coverage that was unpublished,
 * renamed, or never existed.
 */
export function resolveReportingRecord<T extends ResolvableArticle>(
  entries: ReportingRecordEntry[],
  articles: T[],
): Array<ResolvedReportingEntry<T>> {
  const bySlug = new Map<string, T>();
  for (const article of articles) {
    if (article.canonical_slug) bySlug.set(article.canonical_slug, article);
  }

  const resolved: Array<ResolvedReportingEntry<T>> = [];
  for (const entry of entries) {
    const article = bySlug.get(entry.articleSlug);
    if (article) resolved.push({ article, whatItShows: entry.whatItShows });
  }
  return resolved;
}

/** Resolve one FAQ's supporting article, or null when it is not live. */
export function resolveFaqSource<T extends ResolvableArticle>(
  faq: FlagshipFaq,
  articles: T[],
): T | null {
  if (!faq.sourceArticleSlug) return null;
  return articles.find((article) => article.canonical_slug === faq.sourceArticleSlug) ?? null;
}

// ---------- market comparison ----------

export const COMPARISON_METRIC_KEYS = ["typical-home-value", "observed-rent"] as const;
export type ComparisonMetricKey = (typeof COMPARISON_METRIC_KEYS)[number];

export type AreaComparisonRow = {
  slug: string;
  label: string;
  /** True for the hub the reader is on. */
  isSubject: boolean;
  /** True for the metro-wide baseline row. */
  isBaseline: boolean;
  /** One entry per comparison metric, null when no series is published. */
  metrics: Record<ComparisonMetricKey, MarketMetric | null>;
};

export type AreaMarketComparison = {
  rows: AreaComparisonRow[];
  /** Distinct source names across every cell, for one honest footnote. */
  sources: Array<{ name: string; url: string | null }>;
  /** True when at least one cell has a value. */
  hasAnyValue: boolean;
  /** Slugs asked for that had no published series at all. */
  missingSlugs: string[];
};

function metricFor(set: MarketDataSet, geographySlug: string, metricKey: string): MarketMetric | null {
  return set.metrics.find((metric) => metric.geography.slug === geographySlug && metric.metricKey === metricKey) ?? null;
}

/**
 * Line a flagship area up against its substitutes and the metro baseline,
 * using only what the canonical market set already carries.
 *
 * Nothing is computed, averaged, or filled in. A geography with no published
 * series renders as an explicit gap, which is the honest answer when Zillow's
 * files do not cover a neighborhood.
 */
export function buildAreaMarketComparison(
  set: MarketDataSet,
  subjectSlug: string,
  comparisonSlugs: string[],
  labelForSlug: (slug: string) => string,
): AreaMarketComparison {
  const ordered: string[] = [subjectSlug];
  for (const slug of comparisonSlugs) {
    if (!ordered.includes(slug)) ordered.push(slug);
  }
  if (!ordered.includes(COMPARISON_BASELINE_SLUG)) ordered.push(COMPARISON_BASELINE_SLUG);

  const rows: AreaComparisonRow[] = [];
  const missingSlugs: string[] = [];
  const sources = new Map<string, string | null>();
  let hasAnyValue = false;

  for (const slug of ordered) {
    const metrics = {
      "typical-home-value": metricFor(set, slug, "typical-home-value"),
      "observed-rent": metricFor(set, slug, "observed-rent"),
    } satisfies Record<ComparisonMetricKey, MarketMetric | null>;

    const present = COMPARISON_METRIC_KEYS.filter((key) => metrics[key] !== null);
    if (present.length === 0) missingSlugs.push(slug);
    else hasAnyValue = true;

    for (const key of present) {
      const metric = metrics[key]!;
      if (metric.source.name) sources.set(metric.source.name, metric.source.url);
    }

    rows.push({
      slug,
      label: labelForSlug(slug),
      isSubject: slug === subjectSlug,
      isBaseline: slug === COMPARISON_BASELINE_SLUG && slug !== subjectSlug,
      metrics,
    });
  }

  return {
    rows,
    sources: [...sources.entries()].map(([name, url]) => ({ name, url })),
    hasAnyValue,
    missingSlugs,
  };
}
