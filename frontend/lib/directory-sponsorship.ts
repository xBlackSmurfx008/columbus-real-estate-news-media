export type DirectoryRiskLevel = "lower" | "moderate" | "high";

export type DirectoryCategoryRule = {
  category: string;
  riskLevel: DirectoryRiskLevel;
  pilotPriority: string;
  sponsorFit: string;
  requiredProof: readonly string[];
  allowedClaims: readonly string[];
  blockedClaims: readonly string[];
  reviewCadence: string;
};

export type DirectoryListingField = {
  group: string;
  fields: readonly {
    label: string;
    purpose: string;
    requiredFor: "basic listing" | "claim review" | "paid placement" | "high-risk category";
  }[];
};

export type DirectoryVerificationLabel = {
  label: string;
  meaning: string;
  displayRule: string;
  doesNotMean: string;
};

export type SponsorPackageDefinition = {
  name: string;
  price: string;
  term: string;
  bestFor: string;
  deliverables: readonly string[];
  labels: readonly string[];
  reporting: readonly string[];
  boundaries: readonly string[];
};

export type DirectoryPolicy = {
  title: string;
  rules: readonly string[];
};

export type SponsorReportingExample = {
  sponsor: string;
  flight: string;
  placements: readonly string[];
  metrics: readonly string[];
  note: string;
  renewalRecommendation: string;
};

export const DIRECTORY_VERIFICATION_LABELS: readonly DirectoryVerificationLabel[] = [
  {
    label: "Basic listing",
    meaning: "CREN has enough public business identity, category, and service-area information to present the company as a directory option.",
    displayRule: "Use on free listings after review, never as a quality badge.",
    doesNotMean: "Recommended, endorsed, top rated, or performance verified.",
  },
  {
    label: "Claimed by business",
    meaning: "A business owner, employee, or authorized representative has requested control of the listing details.",
    displayRule: "Use only after CREN stores the claimant name, work email, role, and proof path.",
    doesNotMean: "CREN verified every service claim or resolved all consumer complaints.",
  },
  {
    label: "Credentials provided",
    meaning: "The business supplied license, insurance, permit, certification, or professional-registration details for CREN review.",
    displayRule: "Pair with a short verification note or official lookup link where available.",
    doesNotMean: "CREN guarantees active status, legal compliance, workmanship, pricing, or availability.",
  },
  {
    label: "Sponsored provider",
    meaning: "The business paid for a labeled directory, service-guide, newsletter, or area-hub placement.",
    displayRule: "Show before click and on the destination surface.",
    doesNotMean: "Editorial endorsement, ranking advantage disguised as merit, or newsroom coverage approval.",
  },
];

export const DIRECTORY_CATEGORY_RULEBOOK: readonly DirectoryCategoryRule[] = [
  {
    category: "Moving and storage",
    riskLevel: "lower",
    pilotPriority: "First pilot category",
    sponsorFit: "Strong fit for renters, buyers, students, sellers, and relocation readers without requiring CREN to rank housing providers.",
    requiredProof: ["Legal business name", "Service areas", "Insurance or carrier/registration detail where applicable", "Pricing approach", "Complaint contact path"],
    allowedClaims: ["Service area", "Move types handled", "Storage options", "Packing services", "Quote process", "Insurance/coverage explanation"],
    blockedClaims: ["Guaranteed lowest price", "Best mover in Columbus", "Damage-free guarantee unless contract supports it", "CREN approved"],
    reviewCadence: "Quarterly for paid placements; annually for unpaid basic listings.",
  },
  {
    category: "Inspectors, contractors, and remodeling",
    riskLevel: "high",
    pilotPriority: "Pilot only after proof workflow is working",
    sponsorFit: "High-intent category, but higher consumer-risk burden. Use service guides before broad paid prominence.",
    requiredProof: ["License or registration where applicable", "Insurance", "Permit responsibility", "Warranty terms", "Written estimate process", "Complaint/escalation contact"],
    allowedClaims: ["Trade specialty", "License/insurance details", "Estimate process", "Permit support", "Warranty availability", "Service area"],
    blockedClaims: ["Guaranteed code compliance", "No permit needed", "Best contractor", "Unlimited warranty", "Investment return claims"],
    reviewCadence: "Monthly during pilot; quarterly after stable review process.",
  },
  {
    category: "Renters insurance, lending, and title",
    riskLevel: "high",
    pilotPriority: "Use labeled sponsor messages before directory ranking",
    sponsorFit: "Useful around buyer/renter decision tools, but requires strict no-advice and no-steering language.",
    requiredProof: ["Licensed entity", "NMLS or insurance registration where applicable", "Disclosure language", "Rate/fee caveats", "Complaint contact path"],
    allowedClaims: ["Services offered", "License/registration number", "Application process", "Coverage or loan-type education", "Service geography"],
    blockedClaims: ["Guaranteed approval", "Lowest rate", "Everyone qualifies", "No-risk investment", "Protected-class targeting"],
    reviewCadence: "Monthly during pilot; re-review every material offer change.",
  },
  {
    category: "Property management and apartment services",
    riskLevel: "high",
    pilotPriority: "Hold paid ranking until dispute and claim policies are proven",
    sponsorFit: "Important for landlords and renters, but can conflict with renter due-diligence trust if labels are weak.",
    requiredProof: ["Management authority", "Service geography", "Fee model", "Tenant/resident contact path", "Complaint handling", "Fair-housing-safe copy"],
    allowedClaims: ["Management services", "Portfolio type", "Maintenance process", "Application process", "Service geography"],
    blockedClaims: ["Preferred tenant language", "Safe neighborhood claims", "No complaints", "CREN vetted landlord", "Guaranteed occupancy"],
    reviewCadence: "Monthly during pilot and after any dispute.",
  },
  {
    category: "Local living: restaurants, events, family activities, and personal services",
    riskLevel: "moderate",
    pilotPriority: "Use for Weekend Planner inserts after sponsor labels are tested",
    sponsorFit: "Good fit for area-aware local-life sponsorship when availability and hours are checked close to publication.",
    requiredProof: ["Business identity", "Location or service area", "Current hours or event date", "Ticket/reservation terms when applicable", "Disclosure for paid placement"],
    allowedClaims: ["Cuisine or activity type", "Event date", "Reservation or ticket link", "Area served", "Accessibility details supplied by the business"],
    blockedClaims: ["Best family neighborhood", "Official CREN pick without editorial basis", "Guaranteed availability", "Unlabeled paid recommendation"],
    reviewCadence: "Before each event flight or monthly for evergreen local-life listings.",
  },
];

export const DIRECTORY_LISTING_FIELD_GROUPS: readonly DirectoryListingField[] = [
  {
    group: "Business identity",
    fields: [
      { label: "Public business name", purpose: "Reader-facing listing title.", requiredFor: "basic listing" },
      { label: "Legal entity name", purpose: "Confirms the public brand maps to an accountable business.", requiredFor: "claim review" },
      { label: "Website or verified public profile", purpose: "Gives CREN and readers a current independent reference.", requiredFor: "basic listing" },
      { label: "Public phone or contact URL", purpose: "Lets readers contact the provider without routing through editorial copy.", requiredFor: "basic listing" },
    ],
  },
  {
    group: "Service fit",
    fields: [
      { label: "Primary category", purpose: "Controls where the listing appears and which review rules apply.", requiredFor: "basic listing" },
      { label: "Secondary categories", purpose: "Supports later directory filters without keyword stuffing.", requiredFor: "paid placement" },
      { label: "Service areas", purpose: "Prevents listings from appearing in areas they do not actually serve.", requiredFor: "basic listing" },
      { label: "Typical customer or job type", purpose: "Helps route readers without implying protected-class preference.", requiredFor: "paid placement" },
    ],
  },
  {
    group: "Claim and proof record",
    fields: [
      { label: "Claimant name, role, and work email", purpose: "Documents who requested listing control.", requiredFor: "claim review" },
      { label: "Licenses, registrations, insurance, permits, or certifications", purpose: "Supports objective credential claims.", requiredFor: "high-risk category" },
      { label: "Proof links or documents", purpose: "Stores the source behind regulated or performance claims.", requiredFor: "paid placement" },
      { label: "Limitations and exclusions", purpose: "Shows readers what the business does not do.", requiredFor: "paid placement" },
    ],
  },
  {
    group: "Commercial handling",
    fields: [
      { label: "Placement interest", purpose: "Separates free review, enhanced listing, and sponsorship conversations.", requiredFor: "basic listing" },
      { label: "Sponsor disclosure copy", purpose: "Ensures paid placement is visible before click and on page.", requiredFor: "paid placement" },
      { label: "Lead-routing permission", purpose: "Clarifies whether CREN may route inquiries to the sponsor.", requiredFor: "paid placement" },
      { label: "Dispute contact", purpose: "Gives CREN a direct path for correction, removal, and reader complaints.", requiredFor: "paid placement" },
    ],
  },
];

export const SPONSOR_PACKAGE_DEFINITIONS: readonly SponsorPackageDefinition[] = [
  {
    name: "Area Sponsor Pilot",
    price: "$1,500",
    term: "30 days",
    bestFor: "A local company serving one proof-cohort area.",
    deliverables: ["Labeled area-hub sponsor placement", "One sponsor message in an Area Alerts send", "Directory profile review", "End-of-flight performance snapshot"],
    labels: ["Sponsored provider", "Advertisement"],
    reporting: ["Area-hub impressions", "Sponsor-link clicks", "Listing actions", "Newsletter clicks"],
    boundaries: ["No editorial coverage promise", "No exclusive claim unless conflict review approves it", "No protected-class targeting"],
  },
  {
    name: "Category Service Guide Pilot",
    price: "$3,500",
    term: "90 days",
    bestFor: "A provider category such as moving/storage where CREN can give readers a practical checklist without endorsing one company.",
    deliverables: ["Labeled service-guide sponsor slot", "Enhanced directory profile", "Two newsletter sponsor messages", "Lead-routing option with disclosure", "Monthly reporting"],
    labels: ["Sponsor message", "Sponsored provider"],
    reporting: ["Guide impressions", "Directory actions", "Outbound clicks", "Lead count and status", "Renewal recommendation"],
    boundaries: ["Ranking remains editorial/product controlled", "Claims require proof", "Disputes pause paid prominence until reviewed"],
  },
  {
    name: "Market Pulse Sponsor",
    price: "$1,250",
    term: "4 issues",
    bestFor: "A housing-adjacent sponsor seeking citywide awareness around market intelligence.",
    deliverables: ["Labeled newsletter sponsor message", "Sponsor link with UTM", "Optional directory profile link", "Issue-level reporting"],
    labels: ["Advertisement"],
    reporting: ["Sends", "Opens where available", "Clicks", "Subscriber complaints/unsubscribes"],
    boundaries: ["Sponsor copy cannot change market conclusions", "No rate, return, or availability promises without proof"],
  },
  {
    name: "Area Alerts Sponsor",
    price: "$750",
    term: "4 sends",
    bestFor: "A business whose service area matches one named hub or corridor.",
    deliverables: ["Labeled area-alert placement", "Area-specific sponsor link", "Performance snapshot"],
    labels: ["Advertisement"],
    reporting: ["Sends", "Clicks", "Area follow lift", "Reader replies or leads"],
    boundaries: ["No neighborhood desirability claims", "No audience exclusions or preferred-resident language"],
  },
  {
    name: "Weekend Planner Insert",
    price: "$600",
    term: "4 inserts",
    bestFor: "Restaurants, events, attractions, family activities, and local-life sponsors.",
    deliverables: ["Labeled local-life insert", "Event or offer link", "Optional directory profile review", "Post-flight snapshot"],
    labels: ["Advertisement", "Sponsor message"],
    reporting: ["Insert impressions", "Clicks", "Event actions", "Reported availability issues"],
    boundaries: ["Hours, dates, availability, and price must be current before send", "No unlabeled recommendations"],
  },
  {
    name: "Event Promotion",
    price: "$350+",
    term: "Single event flight",
    bestFor: "A time-sensitive opening, market, tour, class, open house, or local event with a clear reader action.",
    deliverables: ["Labeled event promotion", "One tracked link", "Calendar/local-life placement review", "Wrap report"],
    labels: ["Advertisement"],
    reporting: ["Placement views", "Clicks", "Event-action clicks", "Reader questions"],
    boundaries: ["CREN does not guarantee attendance", "Event details must be verified close to publication"],
  },
];

export const FIRST_DIRECTORY_PILOT_PACKAGE = {
  name: "OSU Move-In Services Pilot",
  category: "Moving and storage",
  area: "The Ohio State University area plus nearby Columbus renter hubs",
  term: "90 days around the student-rental and move-in window",
  rate: "$3,500 founding pilot",
  readerJob: "Help students, parents, renters, and small landlords compare moving/storage help, packing, short-term storage, and move-day logistics without treating a sponsor as CREN's preferred provider.",
  deliverables: [
    "Labeled sponsor slot on the moving/storage service guide once built.",
    "Enhanced directory profile with claim/proof record.",
    "One OSU-area Area Alerts sponsor message per month during the pilot.",
    "Weekend Planner insert only when there is a reader-useful offer, deadline, or event.",
    "Monthly report with impressions, clicks, listing actions, leads, issues, and renewal recommendation.",
  ],
  launchCriteria: [
    "Business identity and claimant authority are documented.",
    "Insurance, coverage limits, service area, pricing approach, and complaint contact are supplied.",
    "Paid placement label appears before click and on the destination surface.",
    "CREN can pause the sponsor slot if a dispute, expired proof, or disclosure issue is reported.",
  ],
} as const;

export const DIRECTORY_POLICIES: readonly DirectoryPolicy[] = [
  {
    title: "Ranking and placement",
    rules: [
      "Default directory ordering should be category fit, service-area fit, freshness, and reader utility.",
      "Sponsored placements may receive clearly labeled visibility, but paid status must not be disguised as editorial ranking.",
      "CREN should not use badges such as best, top, recommended, approved, or preferred unless a separate published methodology supports the claim.",
    ],
  },
  {
    title: "Claim ownership",
    rules: [
      "A claim request must include claimant name, role, work email, business website or public profile, and proof of authority.",
      "Conflicting claim requests move the listing into manual review until authority is resolved.",
      "Claimed listings can update factual fields, but they cannot remove required disclosures or rewrite editorial rules.",
    ],
  },
  {
    title: "Disputes and removal",
    rules: [
      "Readers and businesses can report inaccurate identity, category, credentials, service area, pricing, disclosure, or impersonation concerns.",
      "CREN should acknowledge material listing disputes within two business days and pause paid prominence for credible high-risk claims while reviewing.",
      "Listings can be corrected, downgraded, paused, removed, or left unchanged with an internal note documenting the decision.",
    ],
  },
  {
    title: "Refunds and sponsor conflicts",
    rules: [
      "Refunds or make-goods are considered when CREN fails to deliver labeled placements, materially mislabels a sponsor, or removes a sponsor for CREN-caused error.",
      "No refund is promised for normal performance variation, low click volume, or rejected unsupported claims.",
      "Category caps and conflicts must be stated in the insertion order before CREN sells overlapping inventory.",
    ],
  },
];

export const SPONSOR_REPORTING_EXAMPLE: SponsorReportingExample = {
  sponsor: "Example Moving Co.",
  flight: "OSU Move-In Services Pilot, Month 1",
  placements: ["OSU area service-guide sponsor slot", "Enhanced directory profile", "Area Alerts sponsor message", "Weekend Planner insert"],
  metrics: [
    "2,840 sponsor-placement impressions",
    "118 directory profile actions",
    "64 outbound clicks",
    "9 reader inquiries routed with sponsor disclosure",
    "1 listing-detail correction requested and resolved",
  ],
  note: "Performance reporting is aggregate and operational. It does not imply reader endorsement or editorial recommendation.",
  renewalRecommendation: "Renew for 60 days if lead quality is acceptable, no unresolved disputes remain, and CREN can keep the disclosure and proof record current.",
} as const;

export const ADVERTISING_PACKAGE_OPTIONS = [
  ...SPONSOR_PACKAGE_DEFINITIONS.map((item) => item.name),
  "Enhanced Directory Listing",
  "Not sure yet",
] as const;
