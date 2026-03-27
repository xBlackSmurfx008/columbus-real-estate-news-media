import { BlogPost } from "@/lib/types";

const rawBlogPosts: BlogPost[] = [
  {
    slug: "columbus-rent-trends-march-2026",
    title: "Columbus Rent Trends: March 2026",
    areaSlug: "columbus-citywide",
    topicSlug: "market-trends",
    format: "Data Brief",
    excerpt: "A hyperlocal look at rent movement, where concessions are showing up, and what to do next.",
    date: "2026-03-18",
    readTimeMinutes: 6,
    introHook:
      "Rents are still climbing in Columbus, but the pace is uneven. Properties near major job corridors are moving faster than citywide averages.",
    whatChanged: [
      "Average citywide asking rent moved up 2.4% year-over-year.",
      "Concession activity increased in newer Class A inventory near downtown.",
      "Two-bedroom units in suburban school districts saw stronger weekly saves and tour requests.",
    ],
    whatItMeans: {
      renters: "Prioritize neighborhoods with rising concessions and lock rates before summer demand accelerates.",
      buyers: "Steadier rental demand in mixed-use pockets can support small multifamily investment assumptions.",
      sellers: "High-rent corridors with low days-on-market can strengthen timing for move-up inventory listings.",
    },
    bestNeighborhoods: [
      "Dublin: stronger two-bedroom demand with stable vacancy.",
      "Westerville: family-renter interest stays consistent.",
      "Grove City: value-focused renters still convert quickly on clean inventory.",
    ],
    actionChecklist: [
      "Set a rent budget cap before touring.",
      "Compare concessions across at least three nearby buildings.",
      "Tour weekday and weekend to verify noise and commute patterns.",
      "Request utility history before committing to a lease.",
    ],
    sourcesAndMethodology: [
      "Internal listing observations from Columbus inventory reviewed weekly.",
      "Publicly available city and county housing updates.",
      "Comparative trend normalization using monthly baseline snapshots.",
    ],
    cta: {
      label: "Get weekly Columbus rent alerts",
      href: "/subscribe?source=blog-rent-trends",
    },
    internalLinks: [
      { label: "Columbus Citywide hub", href: "/areas/columbus-citywide" },
      { label: "Market Trends topic", href: "/topics/market-trends" },
      { label: "Dublin neighborhood coverage", href: "/areas/dublin" },
    ],
  },
  {
    slug: "upper-arlington-school-zone-pressure",
    title: "Upper Arlington School-Zone Pressure and Home Prices",
    areaSlug: "upper-arlington",
    topicSlug: "schools",
    format: "Article",
    excerpt: "School demand remains a major pricing driver. Here is what changed and where buyers still have leverage.",
    date: "2026-03-16",
    readTimeMinutes: 7,
    introHook:
      "School-zone demand keeps Upper Arlington competitive, but list-to-close spreads are no longer moving in one direction.",
    whatChanged: [
      "Well-priced listings near top elementary zones continue to move quickly.",
      "Overpriced homes are sitting longer than late 2025 benchmarks.",
      "Buyer behavior is shifting toward move-in-ready homes with lower near-term repair risk.",
    ],
    whatItMeans: {
      renters: "Families planning to buy in 12 to 18 months should monitor rental pockets near target schools now.",
      buyers: "Pre-approval and fast decision windows still matter, but negotiation room has improved on stale listings.",
      sellers: "Condition and pricing precision outperform broad premium assumptions tied only to district reputation.",
    },
    bestNeighborhoods: [
      "Upper Arlington core blocks near top-rated schools.",
      "Westerville crossover zones with commuting flexibility.",
      "Dublin alternatives for buyers needing more inventory options.",
    ],
    actionChecklist: [
      "Map school-boundary targets before touring.",
      "Review 90-day comparable sales in your exact micro-area.",
      "Get lender pre-approval updated before submitting offers.",
      "Use inspection strategy to protect timeline and budget.",
    ],
    sourcesAndMethodology: [
      "School district public boundary and performance data.",
      "Recent sale and listing pattern review by neighborhood cluster.",
      "Weekly editorial interviews with local practitioners.",
    ],
    cta: {
      label: "Follow schools and neighborhood updates",
      href: "/subscribe?source=blog-schools",
    },
    internalLinks: [
      { label: "Upper Arlington area hub", href: "/areas/upper-arlington" },
      { label: "Schools topic hub", href: "/topics/schools" },
      { label: "Buyer intent page", href: "/buy" },
    ],
  },
  {
    slug: "columbus-zoning-update-future-supply",
    title: "Columbus Zoning Update: What It Means for Future Supply",
    areaSlug: "columbus-citywide",
    topicSlug: "local-politics",
    format: "Article",
    excerpt: "A practical breakdown of zoning direction and where supply could shift over the next year.",
    date: "2026-03-14",
    readTimeMinutes: 8,
    introHook:
      "Recent zoning decisions can increase supply in selected corridors, but permitting speed and project economics still control delivery.",
    whatChanged: [
      "City-level updates expanded flexibility in specific development pockets.",
      "Builder response is strongest in zones with predictable permitting pathways.",
      "Neighborhood reaction remains mixed depending on traffic and infrastructure concerns.",
    ],
    whatItMeans: {
      renters: "Potential supply expansion can create more choice, but pricing relief depends on delivery timing.",
      buyers: "Upcoming inventory corridors may offer better medium-term options than waiting for immediate broad price drops.",
      sellers: "Supply growth can increase competition in some submarkets, making prep and positioning more important.",
    },
    bestNeighborhoods: [
      "Columbus city corridors with active pipeline approvals.",
      "Dublin edge submarkets tied to expansion routes.",
      "Grove City pockets with near-term construction momentum.",
    ],
    actionChecklist: [
      "Track local planning meetings for neighborhoods you care about.",
      "Compare near-term and 12-month inventory trends before deciding timing.",
      "Ask agents for active vs. approved pipeline context, not just listed homes.",
      "Use scenario planning for budget and timeline decisions.",
    ],
    sourcesAndMethodology: [
      "Public zoning and planning updates from municipal channels.",
      "Area-level construction and permit activity snapshots.",
      "Editorial interviews with local agents and development stakeholders.",
    ],
    cta: {
      label: "Subscribe to policy and development briefs",
      href: "/subscribe?source=blog-policy",
    },
    internalLinks: [
      { label: "Local Politics topic hub", href: "/topics/local-politics" },
      { label: "Columbus citywide area hub", href: "/areas/columbus-citywide" },
      { label: "Market data page", href: "/market-data" },
    ],
  },
];

function validateBlogPost(post: BlogPost): BlogPost {
  if (post.actionChecklist.length < 3 || post.actionChecklist.length > 5) {
    throw new Error(`Blog post ${post.slug} must have 3-5 checklist items.`);
  }

  if (post.internalLinks.length < 3 || post.internalLinks.length > 5) {
    throw new Error(`Blog post ${post.slug} must have 3-5 internal links.`);
  }

  return post;
}

export const blogPosts = rawBlogPosts.map(validateBlogPost);
export const getBlogPostBySlug = (slug: string) => blogPosts.find((post) => post.slug === slug);
