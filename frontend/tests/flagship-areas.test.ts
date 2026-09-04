import assert from "node:assert/strict";
import test from "node:test";
import {
  FLAGSHIP_AREA_SLUGS,
  buildAreaMarketComparison,
  getFlagshipArea,
  getFlagshipRealityCheck,
  isFlagshipArea,
  resolveFaqSource,
  resolveReportingRecord,
  type ResolvableArticle,
} from "../lib/flagship-areas.ts";
import type { MarketDataSet, MarketMetric } from "../lib/market-data-core.ts";
import {
  areaSlugFromHubPath,
  buildAreaPerformance,
  isOrganicReferrerHost,
  normalizeAreaKey,
} from "../lib/area-performance.ts";

// ---------- flagship set ----------

test("the flagship set stays small and deliberate", () => {
  assert.ok(FLAGSHIP_AREA_SLUGS.length >= 5, "at least five flagship hubs");
  assert.ok(FLAGSHIP_AREA_SLUGS.length <= 10, "never more than ten flagship hubs");
  assert.equal(new Set(FLAGSHIP_AREA_SLUGS).size, FLAGSHIP_AREA_SLUGS.length, "no duplicates");
});

test("every flagship area carries a written rationale, reporting, comparisons and FAQs", () => {
  for (const slug of FLAGSHIP_AREA_SLUGS) {
    const area = getFlagshipArea(slug);
    assert.ok(area, `${slug} resolves`);
    assert.ok(area.selectionRationale.length > 40, `${slug} states why it was chosen`);
    assert.ok(area.reportingRecord.length > 0, `${slug} cites published CREN reporting`);
    assert.ok(area.comparisonSlugs.length > 0, `${slug} has areas to compare against`);
    assert.ok(area.faqs.length >= 3, `${slug} answers at least three questions`);

    for (const entry of area.reportingRecord) {
      assert.match(entry.articleSlug, /^[a-z0-9-]+$/, `${slug} cites a canonical slug`);
      assert.ok(entry.whatItShows.length > 20, `${slug} says what the story establishes`);
    }
    for (const faq of area.faqs) {
      assert.ok(faq.question.trim().endsWith("?"), `${slug} FAQ is a question`);
      assert.ok(faq.answer.length > 60, `${slug} FAQ answer is substantive`);
    }
  }
});

test("flagship copy avoids em dashes, per the CREN copywriting standard", () => {
  for (const slug of FLAGSHIP_AREA_SLUGS) {
    const area = getFlagshipArea(slug)!;
    const copy = JSON.stringify(area);
    assert.ok(!copy.includes("—"), `${slug} copy has no em dashes`);
  }
});

test("a flagship area either has a proof-cohort reality check or supplies its own", () => {
  const proofCohort = new Set(["columbus-citywide", "dublin", "german-village", "franklinton", "ohio-state-university-area"]);
  for (const slug of FLAGSHIP_AREA_SLUGS) {
    const own = getFlagshipRealityCheck(slug);
    assert.ok(own || proofCohort.has(slug), `${slug} renders a reality check from somewhere`);
    if (own) {
      assert.ok(own.bestFor.length > 0 && own.notBestFor.length > 0);
      assert.ok(own.whatToVerify.length >= 3, `${slug} tells the reader what to verify`);
      assert.ok(own.nearbySubstitutes.length >= 3, `${slug} offers alternatives`);
      for (const substitute of own.nearbySubstitutes) {
        assert.match(substitute.href, /^\/areas\/[a-z0-9-]+$/);
      }
    }
  }
});

test("non-flagship areas get no flagship treatment", () => {
  assert.equal(isFlagshipArea("reese"), false);
  assert.equal(getFlagshipArea("reese"), null);
  assert.equal(getFlagshipRealityCheck("reese"), null);
});

// ---------- reporting record resolution ----------

const liveArticles: Array<ResolvableArticle & { id: number }> = [
  { id: 1, title: "Dublin Approves Bridge North Plan With 296 Homes", date: "Aug 15, 2026", canonical_slug: "dublin-approves-bridge-north-plan-with-296-homes", area_slug: "dublin" },
];

test("a cited story that is not live is dropped rather than rendered", () => {
  const resolved = resolveReportingRecord(
    [
      { articleSlug: "dublin-approves-bridge-north-plan-with-296-homes", whatItShows: "It was approved." },
      { articleSlug: "a-story-that-was-never-published", whatItShows: "Invented." },
    ],
    liveArticles,
  );

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.article.id, 1);
});

test("an FAQ source resolves only when the article is live", () => {
  assert.equal(resolveFaqSource({ question: "Q?", answer: "A" }, liveArticles), null);
  assert.equal(
    resolveFaqSource({ question: "Q?", answer: "A", sourceArticleSlug: "not-published" }, liveArticles),
    null,
  );
  assert.ok(
    resolveFaqSource(
      { question: "Q?", answer: "A", sourceArticleSlug: "dublin-approves-bridge-north-plan-with-296-homes" },
      liveArticles,
    ),
  );
});

// ---------- market comparison ----------

function metric(geographySlug: string, metricKey: string, value: string): MarketMetric {
  return {
    id: `${metricKey}::${geographySlug}::all-residential`,
    metricKey,
    label: metricKey,
    value,
    valueNumeric: null,
    changeLabel: null,
    direction: "neutral",
    propertyType: "all-residential",
    geography: { slug: geographySlug, label: geographySlug, type: "city" },
    period: { start: null, end: "2026-07-31", label: "July 2026", precision: "month" },
    source: { name: "Zillow Research", url: "https://example.org/zillow", methodologyUrl: null, asOf: "2026-07-31" },
    updatedAt: "2026-07-31",
    origin: "observation",
    hasCompleteProvenance: true,
  };
}

const set: MarketDataSet = {
  metrics: [
    metric("hilliard", "typical-home-value", "$388,604"),
    metric("hilliard", "observed-rent", "$1,635"),
    metric("dublin", "typical-home-value", "$569,121"),
    metric("columbus-citywide", "typical-home-value", "$248,686"),
  ],
  conflicts: [],
  updatedAt: "2026-07-31",
  fromFallback: false,
};

test("the comparison table shows only published series and names the gaps", () => {
  const comparison = buildAreaMarketComparison(set, "hilliard", ["dublin", "short-north"], (slug) => slug);

  assert.deepEqual(
    comparison.rows.map((row) => row.slug),
    ["hilliard", "dublin", "short-north", "columbus-citywide"],
    "subject first, then substitutes, then the metro baseline",
  );
  assert.equal(comparison.rows[0]!.isSubject, true);
  assert.equal(comparison.rows[3]!.isBaseline, true);
  assert.equal(comparison.rows[0]!.metrics["observed-rent"]?.value, "$1,635");
  // Dublin has no rent row in this fixture: the cell is a gap, not a guess.
  assert.equal(comparison.rows[1]!.metrics["observed-rent"], null);
  assert.deepEqual(comparison.missingSlugs, ["short-north"]);
  assert.deepEqual(comparison.sources, [{ name: "Zillow Research", url: "https://example.org/zillow" }]);
  assert.equal(comparison.hasAnyValue, true);
});

test("a subject that is itself the baseline is not duplicated", () => {
  const comparison = buildAreaMarketComparison(set, "columbus-citywide", ["dublin"], (slug) => slug);
  assert.deepEqual(comparison.rows.map((row) => row.slug), ["columbus-citywide", "dublin"]);
  assert.equal(comparison.rows[0]!.isBaseline, false, "the subject row is never labelled the baseline");
});

// ---------- per-area performance ----------

test("organic referrers are search engines, and nothing else is", () => {
  assert.equal(isOrganicReferrerHost("www.google.com"), true);
  assert.equal(isOrganicReferrerHost("google.co.uk"), true);
  assert.equal(isOrganicReferrerHost("duckduckgo.com"), true);
  assert.equal(isOrganicReferrerHost("news.ycombinator.com"), false);
  assert.equal(isOrganicReferrerHost("t.co"), false);
  assert.equal(isOrganicReferrerHost(null), false, "a missing referrer is never organic");
  assert.equal(isOrganicReferrerHost(""), false);
});

test("hub paths resolve to an area slug", () => {
  assert.equal(areaSlugFromHubPath("/areas/upper-arlington"), "upper-arlington");
  assert.equal(areaSlugFromHubPath("/areas/upper-arlington/"), "upper-arlington");
  assert.equal(areaSlugFromHubPath("/areas"), null);
  assert.equal(areaSlugFromHubPath("/blog/some-story"), null);
});

test("slug, display name and hub path all fold onto one area key", () => {
  const directory = [
    { slug: "upper-arlington", name: "Upper Arlington" },
    { slug: "ohio-state-university-area", name: "The Ohio State University area" },
  ];
  assert.equal(normalizeAreaKey("upper-arlington", directory), "upper-arlington");
  assert.equal(normalizeAreaKey("Upper Arlington", directory), "upper-arlington");
  assert.equal(normalizeAreaKey("/areas/upper-arlington", directory), "upper-arlington");
  assert.equal(
    normalizeAreaKey("The Ohio State University area", directory),
    "ohio-state-university-area",
    "a name that does not slugify back to its slug still resolves through the directory",
  );
  assert.equal(normalizeAreaKey("  ", directory), null);
  assert.equal(normalizeAreaKey(null, directory), null);
});

test("the per-area rollup produces organic entrances, follows and leads", () => {
  const summary = buildAreaPerformance({
    directory: [
      { slug: "hilliard", name: "Hilliard" },
      { slug: "bexley", name: "Bexley" },
    ],
    flagshipSlugs: ["hilliard"],
    entrances: [
      { areaSlug: "hilliard", surface: "hub", referrerHost: "www.google.com", views: 4, visitors: 4 },
      { areaSlug: "hilliard", surface: "hub", referrerHost: null, views: 3, visitors: 2 },
      { areaSlug: "hilliard", surface: "article", referrerHost: "bing.com", views: 6, visitors: 5 },
      { areaSlug: "bexley", surface: "article", referrerHost: "www.google.com", views: 2, visitors: 2 },
    ],
    activation: [{ areaSlug: "Hilliard", follows: 2, preferencesSaved: 1 }],
    funnel: [
      { area: "/areas/hilliard", stage: "cta_click", events: 3 },
      { area: "Hilliard", stage: "form_submit", events: 1 },
      { area: "hilliard", stage: "funnel_view", events: 5 },
    ],
    leads: [
      { area: "Hilliard", status: "qualified", leads: 1 },
      { area: "Hilliard", status: "new", leads: 1 },
    ],
  });

  const hilliard = summary.rows.find((row) => row.areaSlug === "hilliard")!;
  assert.equal(hilliard.areaName, "Hilliard");
  assert.equal(hilliard.isFlagship, true);
  assert.equal(hilliard.hubViews, 7);
  assert.equal(hilliard.organicHubEntrances, 4, "the referrer-less views are not organic");
  assert.equal(hilliard.organicArticleEntrances, 6);
  assert.equal(hilliard.organicEntrances, 10);
  assert.equal(hilliard.follows, 2);
  assert.equal(hilliard.preferencesSaved, 1);
  assert.equal(hilliard.funnelViews, 5);
  assert.equal(hilliard.ctaClicks, 3, "a slug, a name and a path all count to one area");
  assert.equal(hilliard.formSubmits, 1);
  assert.equal(hilliard.leads, 2);
  assert.equal(hilliard.qualifiedLeads, 1);
  assert.equal(hilliard.followRatePer100HubViews, 28.6);
  assert.equal(hilliard.leadRatePer100Organic, 20);

  assert.equal(summary.rows[0]!.areaSlug, "hilliard", "flagship areas sort first");
  assert.equal(summary.totals.areas, 2);
  assert.equal(summary.totals.organicEntrances, 12);
  assert.equal(summary.totals.leads, 2);
  assert.equal(summary.flagship.areas, 1);
  assert.equal(summary.flagship.organicEntrances, 10);
  assert.equal(summary.flagship.shareOfOrganicEntrances, 83.3);
});

test("an empty rollup is a valid zero, not a crash", () => {
  const summary = buildAreaPerformance({});
  assert.deepEqual(summary.rows, []);
  assert.equal(summary.totals.organicEntrances, 0);
  assert.equal(summary.flagship.shareOfOrganicEntrances, null);
});
