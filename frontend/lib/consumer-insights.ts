import type { Area } from "@/lib/types";

export const PROOF_COHORT_AREA_SLUGS = [
  "columbus-citywide",
  "dublin",
  "german-village",
  "franklinton",
  "ohio-state-university-area",
] as const;

export const TIER_1_AREA_SLUGS = [
  "columbus-citywide",
  "dublin",
  "upper-arlington",
  "german-village",
  "grandview-heights",
  "bexley",
  "westerville",
  "gahanna",
  "grove-city",
  "hilliard",
  "new-albany",
  "downtown-columbus",
  "short-north",
  "clintonville",
  "franklinton",
] as const;

export const TIER_2_AREA_SLUGS = [
  "worthington",
  "reynoldsburg",
  "whitehall",
  "groveport",
  "canal-winchester",
  "easton-area",
  "polaris-area",
  "university-district",
  "victorian-village",
  "italian-village",
  "olde-towne-east",
  "merion-village",
  "hilltop",
  "northland",
  "north-linden",
  "south-linden",
] as const;

export type AreaReleaseTier = "proof-cohort" | "tier-1" | "tier-2" | "tier-3";

export type AreaReleasePolicy = {
  tier: AreaReleaseTier;
  indexable: boolean;
  sitemapPriority: number;
  changeFrequency: "weekly" | "monthly";
  releaseNote: string;
};

export type AreaRealityCheck = {
  slug: typeof PROOF_COHORT_AREA_SLUGS[number];
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

export type RenterChecklistSection = {
  id: string;
  title: string;
  description: string;
  items: string[];
};

export type BuyerPriceBand = {
  id: string;
  label: string;
  summary: string;
  likelyTradeoffs: string[];
  areasToCompare: Array<{ label: string; href: string }>;
  verifyBeforeTouring: string[];
  nextStep: { label: string; href: string };
};

export type ProofCohortContentPackage = {
  areaSlug: typeof PROOF_COHORT_AREA_SLUGS[number];
  title: string;
  primaryJob: string;
  cadence: string;
  leadPieces: Array<{
    title: string;
    format: string;
    href: string;
    audience: string;
    cta: string;
  }>;
  evidenceRequirements: string[];
};

export type SponsorSafeRule = {
  title: string;
  standard: string;
  check: string;
};

const proofSet = new Set<string>(PROOF_COHORT_AREA_SLUGS);
const tier1Set = new Set<string>(TIER_1_AREA_SLUGS);
const tier2Set = new Set<string>(TIER_2_AREA_SLUGS);

export const CONSUMER_INTENT_CARDS = [
  {
    title: "Where should I live?",
    description: "Compare areas by budget, commute, schools, parks, walkability, and what to verify before deciding.",
    href: "/search?q=where%20should%20I%20live%20in%20Columbus",
    cta: "Start with area fit",
  },
  {
    title: "What should I check before renting?",
    description: "Run through fees, utilities, maintenance, A/C, parking, package security, reviews, and public-record checks.",
    href: "/rent/before-you-sign",
    cta: "Open renter checklist",
  },
  {
    title: "Can I afford to buy here?",
    description: "Use price-band reality, buyer checklists, and nearby substitutes before you commit to one neighborhood.",
    href: "/buy/price-band-reality",
    cta: "Compare buyer paths",
  },
  {
    title: "What changed in this area?",
    description: "Track development, rent pressure, public decisions, local businesses, and neighborhood tradeoffs.",
    href: "/topics/development",
    cta: "Open Development Watch",
  },
] as const;

export const BUYER_PRICE_BANDS: BuyerPriceBand[] = [
  {
    id: "under-250",
    label: "Under $250K",
    summary:
      "Treat this as a tradeoff-first search. Compare property condition, commute, insurance, taxes, financing fit, and whether a nearby area offers a stronger total-cost path.",
    likelyTradeoffs: ["Older housing stock", "Higher repair scrutiny", "More competition for move-in-ready homes", "Longer commute or fewer walkable amenities"],
    areasToCompare: [
      { label: "Hilltop", href: "/areas/hilltop" },
      { label: "South Linden", href: "/areas/south-linden" },
      { label: "Whitehall", href: "/areas/whitehall" },
      { label: "Groveport", href: "/areas/groveport" },
    ],
    verifyBeforeTouring: ["Roof, HVAC, electrical, plumbing, and foundation age", "Taxes and insurance quote", "Loan program fit", "Comparable sold condition", "Required repairs before occupancy"],
    nextStep: { label: "Compare starter-area tradeoffs", href: "/search?q=Columbus%20starter%20home%20areas" },
  },
  {
    id: "250-350",
    label: "$250K-$350K",
    summary:
      "Use this range to compare starter-home competition, first-ring suburbs, and homes that need updates. The useful question is what you give up to stay near your commute anchor.",
    likelyTradeoffs: ["Faster decisions on clean listings", "Condition versus location choices", "School/context verification", "Possible HOA or condo-fee tradeoffs"],
    areasToCompare: [
      { label: "Grove City", href: "/areas/grove-city" },
      { label: "Reynoldsburg", href: "/areas/reynoldsburg" },
      { label: "Clintonville", href: "/areas/clintonville" },
      { label: "Merion Village", href: "/areas/merion-village" },
    ],
    verifyBeforeTouring: ["Monthly payment including taxes and insurance", "Inspection strategy", "Attendance boundary", "Comparable pending and sold homes", "Commute at real drive times"],
    nextStep: { label: "Follow buyer price-band alerts", href: "/subscribe?source=price-band-reality&topic=Buyer%20Price-Band%20Reality" },
  },
  {
    id: "350-500",
    label: "$350K-$500K",
    summary:
      "This is the substitution range: compare the premium neighborhood you want with the adjacent area that may deliver more house, parking, or school/context fit.",
    likelyTradeoffs: ["Premium neighborhood identity versus square footage", "Updated interior versus outdoor space", "Parking and walkability tension", "Property-tax and HOA differences"],
    areasToCompare: [
      { label: "German Village", href: "/areas/german-village" },
      { label: "Dublin", href: "/areas/dublin" },
      { label: "Worthington", href: "/areas/worthington" },
      { label: "Upper Arlington", href: "/areas/upper-arlington" },
    ],
    verifyBeforeTouring: ["Nearby substitute areas", "Renovation and preservation constraints", "Taxes and HOA costs", "School attendance area", "Offer terms beyond price"],
    nextStep: { label: "Compare premium substitutes", href: "/search?q=German%20Village%20Dublin%20Worthington%20Upper%20Arlington" },
  },
  {
    id: "500-750",
    label: "$500K-$750K",
    summary:
      "Expect a quality-and-lifestyle decision. Compare school/context needs, lot size, commute, newer versus historic construction, and seller timing before narrowing too fast.",
    likelyTradeoffs: ["Higher expectation for condition", "Neighborhood identity premium", "New-build versus established-area choice", "More due diligence on updates and permits"],
    areasToCompare: [
      { label: "Dublin", href: "/areas/dublin" },
      { label: "Grandview Heights", href: "/areas/grandview-heights" },
      { label: "Bexley", href: "/areas/bexley" },
      { label: "New Albany", href: "/areas/new-albany" },
    ],
    verifyBeforeTouring: ["Permit history for major work", "Age of mechanical systems", "Tax district and levy context", "HOA rules", "Resale depth for the exact micro-area"],
    nextStep: { label: "Follow premium-area alerts", href: "/subscribe?source=price-band-reality&topic=Premium%20Area%20Alerts" },
  },
  {
    id: "750-plus",
    label: "$750K+",
    summary:
      "Use this band for scarcity, privacy, school/context, commute, and resale-depth questions. The right path may involve fewer public comps and more source-backed local context.",
    likelyTradeoffs: ["Fewer comparable sales", "Custom-condition questions", "Longer seller negotiation cycles", "Privacy, lot, and location premiums"],
    areasToCompare: [
      { label: "Dublin", href: "/areas/dublin" },
      { label: "New Albany", href: "/areas/new-albany" },
      { label: "Upper Arlington", href: "/areas/upper-arlington" },
      { label: "Bexley", href: "/areas/bexley" },
    ],
    verifyBeforeTouring: ["Recent comparable quality", "Private listing context", "Taxes and ongoing ownership costs", "Major renovation documentation", "Resale audience depth"],
    nextStep: { label: "Request buyer guidance", href: "/subscribe?source=price-band-reality&topic=Buyer%20Guidance" },
  },
];

const REALITY_CHECKS: Record<typeof PROOF_COHORT_AREA_SLUGS[number], AreaRealityCheck> = {
  "columbus-citywide": {
    slug: "columbus-citywide",
    label: "Proof cohort",
    primaryQuestion: "Where should I look in Columbus if my budget, commute, and daily routine all matter?",
    shortAnswer:
      "Start citywide, then narrow by the tradeoff you cannot change: budget, commute anchor, school/context needs, renter risk, or local-life routine.",
    bestFor: ["Relocators comparing the metro", "Renters and buyers who need a short list", "Operators tracking market and development change"],
    notBestFor: ["Final address-level decisions", "School assignment certainty", "A replacement for property records or active listings"],
    budgetReality:
      "Use citywide data to decide which areas deserve deeper research, then verify current listings and exact address costs before acting.",
    localLifeStack: ["Area comparison", "Market Pulse", "Development Watch", "Weekend by Area", "Housing-search next steps"],
    whatChanged: ["Population and housing demand remain linked", "Inventory and affordability are moving unevenly by area", "Development can change commute, rent, and local-life assumptions"],
    whatToVerify: ["Exact municipality and tax district", "School attendance boundary", "Commute at real travel times", "Latest sale or rent data period", "Pending nearby projects"],
    nearbySubstitutes: [
      { label: "Dublin", href: "/areas/dublin" },
      { label: "German Village", href: "/areas/german-village" },
      { label: "Franklinton", href: "/areas/franklinton" },
      { label: "OSU Area", href: "/areas/ohio-state-university-area" },
    ],
    followPromise: "Get Columbus market, development, and area-comparison alerts.",
    cadence: "Weekly",
    primaryCta: { label: "Compare Columbus areas", href: "/areas" },
    secondaryCta: { label: "Follow Market Pulse", href: "/subscribe?source=columbus-citywide-reality-check&topic=Market%20Pulse&area=Columbus%20Citywide" },
  },
  dublin: {
    slug: "dublin",
    label: "Proof cohort",
    primaryQuestion: "Does Dublin fit my budget, commute, school/context needs, and suburban routine?",
    shortAnswer:
      "Dublin is a premium-suburb decision. Compare total housing cost, tax district, school assignment, commute, and nearby substitutes before assuming the name alone solves the move.",
    bestFor: ["Relocating families", "Move-up buyers", "Sellers tracking premium-suburb demand", "Service providers serving higher-income households"],
    notBestFor: ["Lowest-cost Columbus-area searches", "Users who need dense urban walkability", "Address decisions without multi-county boundary checks"],
    budgetReality:
      "Treat Dublin as a higher-cost starting point, then compare Hilliard, Worthington, Westerville, and New Albany by budget, commute, school assignment, and housing stock.",
    localLifeStack: ["School/context verification", "Parks and youth activities", "Bridge Park and local dining", "Seller timing", "Relocation checklist"],
    whatChanged: ["Growth and premium demand keep Dublin on relocator short lists", "Newer development can change commute and local-life patterns", "Multi-county boundaries make address verification important"],
    whatToVerify: ["School attendance area", "City and county boundary", "Taxes and HOA costs", "Commute to the real workplace", "New-build and resale tradeoffs"],
    nearbySubstitutes: [
      { label: "Hilliard", href: "/areas/hilliard" },
      { label: "Worthington", href: "/areas/worthington" },
      { label: "Westerville", href: "/areas/westerville" },
      { label: "New Albany", href: "/areas/new-albany" },
    ],
    followPromise: "Get Dublin market, development, school/context, and seller-timing alerts.",
    cadence: "Weekly or biweekly",
    primaryCta: { label: "Compare premium suburbs", href: "/search?q=Dublin%20Hilliard%20Worthington%20Westerville" },
    secondaryCta: { label: "Follow Dublin", href: "/subscribe?source=dublin-reality-check&topic=Area%20Alerts&area=Dublin" },
  },
  "german-village": {
    slug: "german-village",
    label: "Proof cohort",
    primaryQuestion: "Can I actually live in German Village, and what tradeoffs come with the historic, walkable setting?",
    shortAnswer:
      "German Village is a premium walkable and historic-area decision. The useful comparison is not only price; it is preservation, parking, home condition, tourism/local-life overlap, and nearby substitutes.",
    bestFor: ["Historic-home buyers", "Walkability-focused renters and buyers", "Sellers in high-identity areas", "Local-life readers"],
    notBestFor: ["Users who want newer housing with minimal maintenance", "Buyers unwilling to verify preservation constraints", "People who need easy parking as a first priority"],
    budgetReality:
      "If German Village strains the budget or maintenance tolerance, compare Merion Village, Brewery District, Olde Towne East, and South Side before leaving the urban-core search.",
    localLifeStack: ["Historic-home maintenance", "Restaurants and local routine", "Parks and weekend use", "Parking checks", "Nearby-area substitutes"],
    whatChanged: ["Walkable premium areas keep drawing buyer and local-life attention", "Restaurant and visitor patterns shape daily living", "Historic housing adds inspection and preservation questions"],
    whatToVerify: ["Historic or preservation rules", "Parking conditions", "Home age and maintenance scope", "Noise and visitor patterns", "Exact nearby substitutes"],
    nearbySubstitutes: [
      { label: "Merion Village", href: "/areas/merion-village" },
      { label: "Brewery District", href: "/areas/brewery-district" },
      { label: "Olde Towne East", href: "/areas/olde-towne-east" },
      { label: "South Side", href: "/areas/south-side" },
    ],
    followPromise: "Get German Village housing, preservation, restaurant, and nearby-substitute alerts.",
    cadence: "Biweekly",
    primaryCta: { label: "Compare nearby substitutes", href: "/search?q=German%20Village%20alternatives" },
    secondaryCta: { label: "Follow German Village", href: "/subscribe?source=german-village-reality-check&topic=Area%20Alerts&area=German%20Village" },
  },
  franklinton: {
    slug: "franklinton",
    label: "Proof cohort",
    primaryQuestion: "Is Franklinton's change creating opportunity, risk, or both?",
    shortAnswer:
      "Franklinton needs a change brief, not a booster guide. Track development status, renter impact, arts/local-life anchors, affordability pressure, investor attention, and what still needs verification.",
    bestFor: ["Development watchers", "Renters comparing near-downtown options", "Investors who need more than spreadsheet context", "Residents tracking local change"],
    notBestFor: ["Users who want settled assumptions", "Unverified project speculation", "Investment decisions without property and code due diligence"],
    budgetReality:
      "Use Franklinton as a change-sensitive comparison point. Price, rent, parking, floodplain, project status, and surrounding block conditions need current verification.",
    localLifeStack: ["Development Watch", "Arts and riverfront context", "Renter due diligence", "Investor due diligence", "Displacement and community context"],
    whatChanged: ["Development attention has shifted expectations", "Renter and investor questions overlap with resident concerns", "Local-life anchors can change quickly"],
    whatToVerify: ["Project approval versus proposal status", "Floodplain and insurance context where relevant", "Parking and transit fit", "Rental terms and code complaints", "Resident/community concerns"],
    nearbySubstitutes: [
      { label: "Downtown", href: "/areas/downtown-columbus" },
      { label: "Hilltop", href: "/areas/hilltop" },
      { label: "Brewery District", href: "/areas/brewery-district" },
      { label: "Westgate / West Scioto", href: "/areas/westgate-west-scioto" },
    ],
    followPromise: "Get Franklinton development, renter, investor, and local-change alerts.",
    cadence: "Weekly",
    primaryCta: { label: "Open Development Watch", href: "/topics/development" },
    secondaryCta: { label: "Follow Franklinton", href: "/subscribe?source=franklinton-reality-check&topic=Development%20Watch&area=Franklinton" },
  },
  "ohio-state-university-area": {
    slug: "ohio-state-university-area",
    label: "Proof cohort",
    primaryQuestion: "How do I avoid a bad student-rental decision near OSU?",
    shortAnswer:
      "The OSU-area decision is seasonal and practical. Start with lease timing, fees, parking, packages, maintenance response, management proof, safety checks, and exact commute to campus or work.",
    bestFor: ["Students", "Parents helping with rental decisions", "Renters comparing campus-adjacent areas", "Landlords and service providers"],
    notBestFor: ["Signing from photos alone", "Assuming every campus-adjacent listing has the same risk", "Skipping public-record and lease-term checks"],
    budgetReality:
      "Advertised rent is only the starting point. Compare required fees, utilities, parking, deposits, renewal terms, roommate rules, and transit before deciding.",
    localLifeStack: ["Before You Sign checklist", "Rental timing calendar", "Parking and transit", "Food and student services", "Campus rental alerts"],
    whatChanged: ["Student-rental timing creates recurring pressure", "Reviews and public records need careful interpretation", "Parents and students need different levels of due diligence"],
    whatToVerify: ["Authorized owner or manager", "All required fees and utilities", "Maintenance and emergency process", "Parking and package rules", "Code complaints and lease terms"],
    nearbySubstitutes: [
      { label: "University District", href: "/areas/university-district" },
      { label: "North Campus", href: "/areas/north-campus" },
      { label: "South Campus area", href: "/areas/south-campus-area" },
      { label: "Old North Columbus", href: "/areas/old-north-columbus" },
    ],
    followPromise: "Get OSU rental timing, lease-check, fee, parking, and campus-area alerts.",
    cadence: "Weekly during rental season",
    primaryCta: { label: "Open Before You Sign", href: "/rent/before-you-sign" },
    secondaryCta: { label: "Follow campus rental alerts", href: "/subscribe?source=osu-area-reality-check&topic=Campus%20Rental%20Alerts&area=The%20Ohio%20State%20University%20area" },
  },
};

export const PROOF_COHORT_CONTENT_PACKAGES: Record<typeof PROOF_COHORT_AREA_SLUGS[number], ProofCohortContentPackage> = {
  "columbus-citywide": {
    areaSlug: "columbus-citywide",
    title: "Columbus decision package",
    primaryJob: "Help a mover, renter, buyer, owner, or operator narrow the metro by budget, commute, local-life routine, and current change.",
    cadence: "Weekly",
    leadPieces: [
      { title: "Where Should I Live in Columbus?", format: "Decision flow", href: "/areas", audience: "Relocators and local movers", cta: "Compare areas" },
      { title: "Columbus Market Pulse", format: "Weekly brief", href: "/topics/market-trends", audience: "Owners, buyers, renters, and operators", cta: "Follow Market Pulse" },
      { title: "Rent vs Buy Watch", format: "Comparison guide", href: "/buy/price-band-reality", audience: "Renters deciding whether to buy", cta: "Review price bands" },
      { title: "Development Watch roundup", format: "Explainer", href: "/topics/development", audience: "Residents and investors", cta: "Follow Development Watch" },
      { title: "Weekend by Area", format: "Newsletter insert", href: "/things-to-do", audience: "Residents and visitors", cta: "Plan the weekend" },
    ],
    evidenceRequirements: ["Source and date for market figures", "Clear geography", "No neighborhood safety labels", "Reader-visible limitations", "One measured next action"],
  },
  dublin: {
    areaSlug: "dublin",
    title: "Dublin premium-suburb package",
    primaryJob: "Help families, move-up buyers, sellers, and relocators verify whether Dublin fits budget, school/context, tax, commute, and lifestyle needs.",
    cadence: "Weekly or biweekly",
    leadPieces: [
      { title: "Dublin Reality Check", format: "Area guide", href: "/areas/dublin", audience: "Relocators and move-up buyers", cta: "Follow Dublin" },
      { title: "Dublin vs Hilliard vs Worthington vs Westerville", format: "Comparison", href: "/search?q=Dublin%20Hilliard%20Worthington%20Westerville", audience: "Suburban buyers", cta: "Compare suburbs" },
      { title: "Dublin Buyer Price-Band Reality", format: "Buyer guide", href: "/buy/price-band-reality", audience: "Buyers and agents", cta: "Review price bands" },
      { title: "Dublin Seller Timing Brief", format: "Seller brief", href: "/sell/your-home", audience: "Homeowners", cta: "Plan a sale" },
      { title: "Dublin Family Weekend Guide", format: "Local-life insert", href: "/things-to-do", audience: "Parents and residents", cta: "Plan by area" },
    ],
    evidenceRequirements: ["School/context disclaimer", "Tax district verification", "Multi-county boundary note", "Nearby substitute links", "Sponsor/editorial separation"],
  },
  "german-village": {
    areaSlug: "german-village",
    title: "German Village historic-living package",
    primaryJob: "Help buyers, renters, and sellers understand historic-home tradeoffs, walkability, parking, preservation, restaurants, and nearby substitutes.",
    cadence: "Biweekly",
    leadPieces: [
      { title: "German Village Reality Check", format: "Area guide", href: "/areas/german-village", audience: "Walkability-focused buyers and renters", cta: "Follow German Village" },
      { title: "German Village Substitutes", format: "Comparison", href: "/search?q=German%20Village%20alternatives", audience: "Budget-flexible urban-core movers", cta: "Compare nearby areas" },
      { title: "Historic Home Verification", format: "Due-diligence guide", href: "/housing-search", audience: "Historic-home buyers", cta: "Verify before touring" },
      { title: "Parking, Food, Parks, and Routine", format: "Local-life guide", href: "/things-to-do", audience: "Residents and weekend visitors", cta: "Explore local life" },
      { title: "Premium Walkable Seller Brief", format: "Seller brief", href: "/sell/your-home", audience: "Homeowners", cta: "Plan a sale" },
    ],
    evidenceRequirements: ["Preservation and permit caveat", "No unsupported restaurant rankings", "Parking verification prompts", "Nearby substitute links", "Clear ad labels"],
  },
  franklinton: {
    areaSlug: "franklinton",
    title: "Franklinton change-watch package",
    primaryJob: "Help renters, residents, investors, and operators separate approved projects, proposals, affordability pressure, local-life anchors, and due-diligence questions.",
    cadence: "Weekly",
    leadPieces: [
      { title: "Franklinton What Changed Here", format: "Development brief", href: "/areas/franklinton", audience: "Residents and development watchers", cta: "Follow Franklinton" },
      { title: "Franklinton Renter Guide", format: "Due-diligence guide", href: "/rent/before-you-sign", audience: "Renters", cta: "Open Before You Sign" },
      { title: "Franklinton Investor Due Diligence", format: "Investor brief", href: "/invest/deploy-capital", audience: "Investors and operators", cta: "Review investor path" },
      { title: "Project Status Tracker", format: "Development watch", href: "/topics/development", audience: "Residents and service providers", cta: "Track development" },
      { title: "Arts and Riverfront Local Life", format: "Local-life guide", href: "/things-to-do", audience: "Residents and visitors", cta: "Explore by area" },
    ],
    evidenceRequirements: ["Proposal versus approved status", "Floodplain/insurance caveat where relevant", "Resident impact context", "No investment return claims", "Source date for every project"],
  },
  "ohio-state-university-area": {
    areaSlug: "ohio-state-university-area",
    title: "OSU campus-rental package",
    primaryJob: "Help students, parents, renters, and landlords avoid bad lease decisions by checking timing, fees, maintenance, parking, packages, management proof, and records.",
    cadence: "Weekly during rental season",
    leadPieces: [
      { title: "Before You Sign Near OSU", format: "Checklist", href: "/rent/before-you-sign", audience: "Students and parents", cta: "Open checklist" },
      { title: "OSU Rental Timing Calendar", format: "Seasonal guide", href: "/areas/ohio-state-university-area", audience: "Students and roommates", cta: "Follow campus alerts" },
      { title: "Fee and Package Red Flags", format: "Renter guide", href: "/rent/before-you-sign", audience: "Campus-area renters", cta: "Check fees first" },
      { title: "Parent Verification Guide", format: "Due-diligence guide", href: "/housing-search#rent", audience: "Parents helping renters", cta: "Compare rental sources" },
      { title: "Campus Landlord Service Categories", format: "Directory guide", href: "/directory?area=The%20Ohio%20State%20University%20area", audience: "Landlords and service providers", cta: "Find service categories" },
    ],
    evidenceRequirements: ["No landlord allegation without records", "Lease and fee prompts", "Code/public-record caveat", "Fair-housing-safe language", "Separate sponsor placement from advice"],
  },
};

export const RENTER_DUE_DILIGENCE_SECTIONS: RenterChecklistSection[] = [
  {
    id: "price",
    title: "Total monthly cost",
    description: "Advertised rent is not the full monthly decision.",
    items: [
      "Confirm required monthly fees, utilities, trash, pest, amenity, parking, pet, and technology charges.",
      "Ask whether concessions change the effective rent after the first lease term.",
      "Get deposit, application, administrative, holding, and move-in charges in writing before paying.",
    ],
  },
  {
    id: "condition",
    title: "Condition and maintenance",
    description: "A good tour can hide recurring operating problems.",
    items: [
      "Ask how emergency maintenance, A/C, heat, plumbing, pests, elevators, and appliance issues are handled.",
      "Request recent maintenance timing expectations and after-hours contact rules.",
      "Check for water intrusion, mold signs, odors, weak cooling/heating, damaged windows, and poor locks during the tour.",
    ],
  },
  {
    id: "manager",
    title: "Owner or manager proof",
    description: "Verify who can legally rent the unit before sending money.",
    items: [
      "Confirm the legal owner or authorized property manager through independent records or official channels.",
      "Compare the same address across portals for copied photos, conflicting prices, and inconsistent contacts.",
      "Avoid wiring money, gift cards, or irreversible payment before seeing written terms and verifying the unit.",
    ],
  },
  {
    id: "daily-life",
    title: "Daily-life fit",
    description: "A lease is also a parking, commute, package, noise, and neighborhood-routine decision.",
    items: [
      "Verify parking rules, guest parking, towing, transit access, bike storage, and commute at real travel times.",
      "Ask about package handling, building entry, laundry, trash, recycling, snow/ice, and quiet-hour enforcement.",
      "Check groceries, pharmacy, parks, coffee, libraries, and weekend routines you will actually use.",
    ],
  },
  {
    id: "lease",
    title: "Lease and renewal risk",
    description: "Most surprises are in the rules, not the photos.",
    items: [
      "Read renewal terms, notice deadlines, early termination, roommate/sublet rules, pet rules, and entry-notice language.",
      "Ask how repairs, deposits, move-out charges, inspections, and dispute documentation are handled.",
      "Save copies of ads, fee sheets, lease drafts, photos, emails, and payment receipts.",
    ],
  },
  {
    id: "records",
    title: "Public records and reviews",
    description: "Use records and reviews as due-diligence inputs, not automatic verdicts.",
    items: [
      "Search public code-complaint and service-request tools where available for the address or nearby properties.",
      "Read reviews for recurring patterns rather than one-off anger or praise.",
      "Separate verified public records from anecdotes before deciding or sharing claims.",
    ],
  },
];

export function isProofCohortArea(slug: string): boolean {
  return proofSet.has(slug);
}

export function getAreaRealityCheck(area: Area): AreaRealityCheck | null {
  if (!isProofCohortArea(area.slug)) return null;
  return REALITY_CHECKS[area.slug as typeof PROOF_COHORT_AREA_SLUGS[number]];
}

export function getProofCohortContentPackage(area: Area): ProofCohortContentPackage | null {
  if (!isProofCohortArea(area.slug)) return null;
  return PROOF_COHORT_CONTENT_PACKAGES[area.slug as typeof PROOF_COHORT_AREA_SLUGS[number]];
}

export function getAreaFollowPromise(area: Area): string {
  const realityCheck = getAreaRealityCheck(area);
  if (realityCheck) return realityCheck.followPromise;
  if (area.kind === "region") return "Get Columbus market, development, and area-comparison alerts.";
  if (area.kind === "corridor") return `Get ${area.name} housing, openings, commute, and local-service alerts.`;
  if (area.kind === "cdp") return `Get practical housing and nearby-area updates for ${area.name}.`;
  if (area.kind === "neighborhood") return `Get ${area.name} housing, renter, development, and local-life alerts.`;
  return `Get ${area.name} market, housing, school/context, and local-life alerts.`;
}

export function getAreaReleasePolicy(area: Area): AreaReleasePolicy {
  if (proofSet.has(area.slug)) {
    return {
      tier: "proof-cohort",
      indexable: true,
      sitemapPriority: 0.95,
      changeFrequency: "weekly",
      releaseNote: "Proof-cohort hub: eligible for full Area Reality Check treatment and weekly measurement.",
    };
  }

  if (tier1Set.has(area.slug)) {
    return {
      tier: "tier-1",
      indexable: true,
      sitemapPriority: 0.82,
      changeFrequency: "weekly",
      releaseNote: "Tier 1 hub: indexable when source-backed local value, CTA measurement, and freshness owner are in place.",
    };
  }

  if (tier2Set.has(area.slug)) {
    return {
      tier: "tier-2",
      indexable: true,
      sitemapPriority: 0.66,
      changeFrequency: "monthly",
      releaseNote: "Tier 2 hub: indexable as a focused comparison hub when unique local modules and links are complete.",
    };
  }

  return {
    tier: "tier-3",
    indexable: false,
    sitemapPriority: 0.35,
    changeFrequency: "monthly",
    releaseNote: "Tier 3 hub: hold from index or cluster until unique value, source depth, and freshness burden justify expansion.",
  };
}

export function getSearchRecoveryIntent(query: string): "rent" | "buy" | "invest" | "local-life" | "area" {
  const q = query.toLowerCase();
  if (/\b(apartment|rent|lease|landlord|fee|student|osu)\b/.test(q)) return "rent";
  if (/\b(buy|buyer|price|mortgage|home|house|afford)\b/.test(q)) return "buy";
  if (/\b(invest|cash flow|property manager|rental property|duplex)\b/.test(q)) return "invest";
  if (/\b(event|weekend|restaurant|park|kids|date|free)\b/.test(q)) return "local-life";
  return "area";
}

export const SPONSOR_SAFE_SERVICE_RULES: SponsorSafeRule[] = [
  {
    title: "Paid placement is labeled before the click",
    standard:
      "Any paid directory upgrade, sponsored profile, affiliate link, or sponsored guide must be identified near the placement and on the destination page.",
    check: "Disclosure is visible on mobile without relying on hover, footer-only copy, or a separate terms page.",
  },
  {
    title: "Editorial coverage cannot be purchased",
    standard:
      "A sponsor may buy clearly labeled distribution or directory visibility. It cannot buy favorable newsroom coverage, review outcomes, rankings, or article conclusions.",
    check: "Sales notes and public copy separate advertising deliverables from reporting decisions.",
  },
  {
    title: "Claims need proof",
    standard:
      "Objective claims about pricing, licensing, insurance, certifications, service areas, awards, speed, reviews, or outcomes require documentation before publication.",
    check: "Directory review stores source URLs or written proof for each regulated or performance claim.",
  },
  {
    title: "Housing ads avoid discriminatory targeting and language",
    standard:
      "Housing-related listings, sponsors, and lead forms must avoid language or targeting that indicates a protected-class preference, limitation, or exclusion.",
    check: "Review copy describes the property, service, and geography rather than preferred people.",
  },
  {
    title: "Reviews and testimonials stay honest",
    standard:
      "CREN does not suppress negative feedback, manufacture reviews, imply typical outcomes from unusual testimonials, or hide material connections.",
    check: "Testimonial copy discloses incentives or sponsor relationships and avoids unsupported performance claims.",
  },
  {
    title: "Lead routing has a reader-first standard",
    standard:
      "Reader inquiries are routed only to relevant categories or stated sponsor paths, with the commercial relationship disclosed where it affects the user's evaluation.",
    check: "The form source, category, area, and sponsor relationship are visible to operations before follow-up.",
  },
  {
    title: "Complaint and dispute paths exist",
    standard:
      "Readers and businesses need a way to flag inaccurate claims, expired credentials, category abuse, impersonation, or sponsor/editorial confusion.",
    check: "Every directory and sponsor-governance page links to corrections or contact.",
  },
  {
    title: "Local licensing and permit context is linked",
    standard:
      "For higher-risk home services, CREN points readers to official licensing, permit, complaint, or public-record resources where available.",
    check: "Provider pages and service guides include current official verification links before monetized recommendations.",
  },
];
